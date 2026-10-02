---
title: "modular: can you eat it?"
description: How we split our Laravel apps into modules with internachi/modular, and what we got wrong along the way.
date: 2026-10-02
---

Have you ever heard of modular? Well, if you haven't, today is your lucky day.

No, you can't eat it. But you can `composer require` it, which is almost as good.

[internachi/modular](https://github.com/InterNACHI/modular) is a small package that lets you split a
Laravel app into modules. I've used it on a few projects so far, and each one taught me something,
mostly by hurting a little.

## Why bother

You know the story. The app starts tidy, then one day `app/Models` has eighty files and nobody can
tell you where billing ends and users begin. Everything can touch everything, so eventually
everything does.

Microservices fix that by giving you a network, five deploys and a distributed transaction to debug
at 2am. No thanks. What I want is one app, one deploy, one database, with walls inside it. People
call that a modular monolith, and that's what modular gives you.

## How it works

You install it:

```sh
composer require internachi/modular
php artisan vendor:publish --tag=modular-config
```

Then you create a module:

```sh
php artisan make:module billing
```

That gives you a folder at `app-modules/billing` with its own `composer.json`, `src/`, `tests/`,
`routes/`, `resources/` and `database/`. It also adds a Composer
[path repository](https://getcomposer.org/doc/05-repositories.md#path) to your root `composer.json`,
so you finish with:

```sh
composer update modules/billing
```

And that's honestly most of it. A module is a Composer package that happens to live inside your repo.
No new framework to learn, the code inside is plain Laravel. Every `make:*` command takes a
`--module` flag, and migrations, factories, policies, commands, Blade components and listeners are
discovered for you:

```sh
php artisan make:model Invoice --module=billing
php artisan make:event InvoicePaid --module=billing
```

```blade
<x-billing::invoice-summary />
{{ __('billing::messages.paid') }}
```

One thing to do on day one: change the namespace in `config/app-modules.php`. It defaults to
`Modules\`, and the config itself tells you to use your organization name instead. If you ever
want to pull a module out into a real package, you'll be glad you did. (I'll stick with `Modules\`
in the examples here, since that's what you get out of the box.)

## How we split things

After a few projects I ended up with the same handful of module kinds:

- **Domain modules**, like `billing`, `appointments` or `offers`. They own the models and the
  business rules.
- **Integration modules**, always prefixed with `integration-`: `integration-stripe`,
  `integration-whatsapp`, `integration-google-calendar`. One per external system, and only if there's
  an actual external system behind it.
- **Panel modules**, like `panel-admin` or `panel-customer`. These hold the Filament resources, pages
  and widgets for each panel.
- **Shared stuff**, like `permissions` and `tenant`, that every other module leans on.

A small detail that tripped us up at first: the Filament `PanelProvider`s stay in the root `app/`.
The panel module just holds the resources, and the provider points at its folder:

```php
->discoverResources(
    in: base_path('app-modules/panel-admin/src/Filament/Resources'),
    for: 'Modules\\PanelAdmin\\Filament\\Resources',
)
```

On another project we tried it the other way around. Each domain module ships a Filament
plugin and plugs itself into whatever panel it belongs to:

```php
Panel::configureUsing(function (Panel $panel): void {
    match ($panel->currentPanel()) {
        FilamentPanel::Admin => $panel->plugin(new AdminBankingPanelPlugin),
        default => null,
    };
});
```

Both work. The plugin way keeps a feature in one place, the panel module way keeps the domain free of
UI. Pick one and stick with it, because mixing them gets confusing fast.

## The part nobody tells you

Here's what surprised me. modular gives you folders, not walls.

Every module gets autoloaded into the same app, so nothing stops `billing` from doing
`use Modules\Orders\Models\Order` and going wild. None of my module `composer.json` files
require each other, the root app requires all of them, and the only real dependency graph is
whatever the `use` statements say.

On my first projects that's exactly what happened. Modules imported each other's models all
over the place, and we had a few modules depending on panels, which is backwards. It still works, and
it's still way nicer than one giant `app/` folder. But if someone asked me to pull `billing` out into
its own package, I'd need a week and a lot of coffee.

## What we do now

On the most recent one we got stricter, and it's been worth it.

**Talk through contracts, not models.** When a module needs something from the outside, it defines
an interface and someone else implements it. Say `billing` has a
`BillingContract` and a Laravel `Manager`, and each payment integration registers its own driver:

```php
$this->app->make(BillingManager::class)->extend(
    BillingProviderEnum::Stripe->value,
    fn (): BillingContract => new StripeAdapter($this->app->make(StripeClient::class)),
);
```

Optional features get their own small interfaces, like `SupportsCreditPurchase`. One gateway
lets you cancel a subscription and another doesn't? Fine, the UI just checks `instanceof` and hides the button.

Same idea for messaging, on a project that talks to people over WhatsApp and Telegram. There's a `messaging-base` module that has nothing
but contracts:

```php
interface MessageTransport
{
    public function send(string $to, string $text, ?string $replyToExternalId = null): string;
}
```

`integration-telegram` and `integration-whatsapp` implement it, and the rest of the app has no idea
which one it's talking to. Adding a new channel means adding a new module, not touching ten old ones.

**Use events when you don't care who's listening.** When a payment webhook arrives, the integration
doesn't go and create credits itself. It fires the domain's own event, and the `credits` module
reacts:

```php
event(new OrderCreditPurchased(creditOrderId: $order->getKey()));
```

**Write the graph down.** We keep a `CONTEXT-MAP.md` at the root with every module, what it's
responsible for, and who's allowed to depend on whom. Each module also gets its own `CONTEXT.md` with
its vocabulary and a `docs/adr/` folder for decisions. It sounds like bureaucracy. It's the file I
open first when I come back to the project after two weeks.

**Then make CI enforce it.** A diagram is a wish, a test is a rule. Pest's `arch()` is perfect for
this:

```php
arch('messaging-base only has contracts')
    ->expect('Modules\MessagingBase')
    ->not->toUse([
        'Modules\IntegrationWhatsapp',
        'Modules\IntegrationTelegram',
        'Modules\Conversation',
    ]);

arch('transport adapters do not know each other')
    ->expect('Modules\IntegrationWhatsapp')
    ->not->toUse('Modules\IntegrationTelegram');
```

Now if someone imports the wrong thing, the build goes red. We even left one known circular
dependency without a rule on purpose, with a comment explaining why and an issue to fix it. That's
fine. What matters is that it's written down instead of discovered.

## Small things that help

- Keep tests inside each module (`app-modules/*/tests`) and add them to `phpunit.xml`. Running one
  module's tests on its own is really nice.
- Customize the stubs. Our `config/app-modules.php` points `make:module` at our own stubs, so every
  new module comes with a service provider, a phpstan config and empty test folders ready to go.
- Turn on `should_discover_events` if you lean on events between modules, so you don't have to
  register every listener by hand.
- Run `php artisan modules:cache` on deploy.

## When it's not worth it

If it's a small app, a side project or something you're still figuring out, don't. You'll spend more
time deciding which module a class belongs to than writing the class. Modules pay off when there are
several people on the code and clear areas of the business that change for different reasons. Until
then, a plain Laravel app is fine. You can always move to modules later. That's kind of the point.

## So, can you eat it?

Still no. But after a few projects I wouldn't start a big Laravel app without it. Just remember that
the package draws the lines, and keeping them is on you. Write them down and get a test to watch
them for you.
