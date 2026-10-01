// Text content for the terminal's easter eggs.

export const CAT = [
  "    /\\_____/\\",
  "   /  o   o  \\",
  "  ( ==  ^  == )",
  "   )         (",
  "  (           )",
  " ( (  )   (  ) )",
  "(__(__)___(__)__)",
];

export const SAYCAT = ["    \\", "     \\   /\\_/\\", "        ( o.o )", "         > ^ <"];

export const FORTUNES = [
  "It works on my machine.",
  "There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors.",
  "Never deploy on a Friday. Unless the cat says so.",
  "If it fits, I sits.",
  "A cucumber behind you is just a snake you haven't met yet.",
  "The server is fine. The server is always fine. Check the logs anyway.",
  "Weeks of coding can save you hours of planning.",
  "rm -rf is not a backup strategy.",
  "Nap often. Your bugs will still be there when you wake up.",
  "99 little bugs in the code. Take one down, patch it around. 127 little bugs in the code.",
  "Knock it off the table and see what breaks. That's QA.",
  "There is no cloud. It's just someone else's computer. Sometimes it's mine.",
];

export const QUOTES: [string, string][] = [
  ["Simplicity is the ultimate sophistication.", "Leonardo da Vinci"],
  ["Make it work, make it right, make it fast.", "Kent Beck"],
  ["The best code is no code at all.", "Jeff Atwood"],
  ["If it fits, I sits.", "a cat"],
  ["Knock things off the table. See what breaks.", "the cat, on testing"],
  ["Never deploy on a Friday.", "everyone who did"],
  ["Nap often. Your bugs will wait.", "a cat"],
];

// what you'd find scrolling up in my shell (allegedly)
export const PAST_HISTORY = [
  "ssh root@prod",
  "git commit -m \"fix\"",
  "git commit -m \"fix fix\"",
  "git commit -m \"final fix\"",
  "git push --force  # friday, 17:58",
  "php artisan migrate:fresh --env=production",
  "sudo systemctl restart nginx",
  "composer update  # what could go wrong",
  "docker system prune -a",
  "vim .env",
  ":q",
  ":q!",
  "exit",
];

export const ZSHRC = `# ~/.zshrc (the parts worth sharing)
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git laravel docker)

alias art="php artisan"
alias gs="git status"
alias gl="git log --oneline -20"
alias ll="ls -la"
alias meow="echo meow"`;

export const MOTD = `Welcome to catOS 24.04 LTS (GNU/Linux 6.8.0-meow x86_64)

 * Documentation:  help
 * Support:        contact

The cat has been fed. All systems purring.`;

export const OS_RELEASE = `PRETTY_NAME="catOS 24.04 LTS (Purring Panther)"
NAME="catOS"
VERSION_ID="24.04"
ID=catos
ID_LIKE=ubuntu
HOME_URL="https://thaleslab.xyz"`;

export const CUCUMBER_LOG = `[2026-09-28 03:12:44] WARN  cucumber detected behind food bowl
[2026-09-28 03:12:44] INFO  cat jumped 1.8m vertically
[2026-09-28 03:12:45] ERROR food bowl knocked over
[2026-09-29 14:02:10] WARN  cucumber detected on keyboard
[2026-09-29 14:02:11] INFO  commit "asdfghjkl" pushed to main
[2026-09-30 22:47:03] INFO  no cucumbers detected. suspicious.`;

export const LUA_FACES = {
  idle: [" /\\_/\\", "( o.o )", " > ^ <"],
  purr: [" /\\_/\\", "( ^.^ )", " > ♥ <"],
  bite: [" /\\_/\\", "( >.< )", " > ^ <"],
  ignore: [" /\\_/\\", "( -.- )", " > ^ <"],
};
