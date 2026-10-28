/**
 * BotForge import analyser.
 *
 * Reads pasted Python source, extracts every top-level import, separates the
 * standard library from third-party modules, maps module names to their real
 * PyPI distribution names (e.g. `telebot` -> `pyTelegramBotAPI`,
 * `PIL` -> `Pillow`) and decides which *major version* of a Telegram framework
 * the code was written against. That last part matters: python-telegram-bot 13
 * and 21 have incompatible APIs, so we pin the right one automatically.
 */
import type { Analysis, DetectedImport, PackageHint } from "./types";

/** Python 3.10+ standard library top-level modules. */
const STDLIB = new Set(
  `__future__ _thread abc aifc argparse array ast asynchat asyncio asyncore atexit audioop
  base64 bdb binascii bisect builtins bz2 cProfile calendar cgi cgitb chunk cmath cmd code
  codecs codeop collections colorsys compileall concurrent configparser contextlib contextvars
  copy copyreg crypt csv ctypes curses dataclasses datetime dbm decimal difflib dis distutils
  doctest email encodings ensurepip enum errno faulthandler fcntl filecmp fileinput fnmatch
  fractions ftplib functools gc getopt getpass gettext glob graphlib grp gzip hashlib heapq hmac
  html http imaplib imghdr imp importlib inspect io ipaddress itertools json keyword lib2to3
  linecache locale logging lzma mailbox mailcap marshal math mimetypes mmap modulefinder msilib
  msvcrt multiprocessing netrc nis nntplib ntpath numbers operator optparse os ossaudiodev
  parser pathlib pdb pickle pickletools pipes pkgutil platform plistlib poplib posix posixpath
  pprint profile pstats pty pwd py_compile pyclbr pydoc queue quopri random re readline reprlib
  resource rlcompleter runpy sched secrets select selectors shelve shlex shutil signal site smtpd
  smtplib sndhdr socket socketserver spwd sqlite3 sre_compile sre_constants sre_parse ssl stat
  statistics string stringprep struct subprocess sunau symtable sys sysconfig syslog tabnanny
  tarfile telnetlib tempfile termios textwrap threading time timeit tkinter token tokenize trace
  traceback tracemalloc tty turtle turtledemo types typing unicodedata unittest urllib uu uuid
  venv warnings wave weakref webbrowser winreg winsound wsgiref xdrlib xml xmlrpc zipapp zipfile
  zipimport zlib zoneinfo`.split(/\s+/)
);

/**
 * module -> PyPI distribution. Only the cases where the import name differs from
 * the package name need to be here; unknown modules fall back to their own name
 * (which is correct for the vast majority of packages on PyPI).
 */
const MODULE_TO_PKG: Record<string, string> = {
  // Telegram & chat platforms
  telebot: "pyTelegramBotAPI",
  telegram: "python-telegram-bot",
  pyrogram: "pyrogram",
  telethon: "telethon",
  aiogram: "aiogram",
  tgcrypto: "TgCrypto",
  TgCrypto: "TgCrypto",
  discord: "discord.py",
  slack_sdk: "slack-sdk",
  slack: "slackclient",
  vk_api: "vk-api",
  vkbottle: "vkbottle",
  whatsapp: "pywhatkit",
  tweepy: "tweepy",
  openai: "openai",
  anthropic: "anthropic",
  google: "google-generativeai",
  groq: "groq",
  cohere: "cohere",
  replicate: "replicate",
  ollama: "ollama",
  together: "together",
  mistralai: "mistralai",

  // dotted modules we want to normalise
  "google.generativeai": "google-generativeai",
  "google.cloud": "google-cloud-storage",
  "telegram.ext": "python-telegram-bot",
  "telegram.request": "python-telegram-bot",
  "pyrogram.raw": "pyrogram",
  "aiogram.client": "aiogram",

  // media / files / vision
  PIL: "Pillow",
  cv2: "opencv-python",
  imageio: "imageio",
  moviepy: "moviepy",
  pydub: "pydub",
  ffmpeg: "ffmpeg-python",
  qrcode: "qrcode",
  pyzbar: "pyzbar",
  pytesseract: "pytesseract",
  easyocr: "easyocr",
  gtts: "gTTS",
  gtts_token: "gTTS-token",
  speech_recognition: "SpeechRecognition",
  pyaudio: "PyAudio",
  soundfile: "soundfile",
  librosa: "librosa",
  mutagen: "mutagen",
  yt_dlp: "yt-dlp",
  youtube_dl: "youtube-dl",
  pytube: "pytube",
  instaloader: "instaloader",
  wget: "wget",
  docx: "python-docx",
  pptx: "python-pptx",
  openpyxl: "openpyxl",
  xlrd: "xlrd",
  fpdf: "fpdf2",
  reportlab: "reportlab",
  PyPDF2: "PyPDF2",
  pypdf: "pypdf",
  fitz: "PyMuPDF",
  pdfplumber: "pdfplumber",
  tabula: "tabula-py",

  // data / science
  np: "numpy",
  pd: "pandas",
  sklearn: "scikit-learn",
  scipy: "scipy",
  seaborn: "seaborn",
  plotly: "plotly",
  mplfinance: "mplfinance",
  talib: "TA-Lib",
  pandas_ta: "pandas-ta",
  statsmodels: "statsmodels",
  tensorflow: "tensorflow",
  torch: "torch",
  keras: "keras",
  transformers: "transformers",
  datasets: "datasets",
  sentence_transformers: "sentence-transformers",
  nltk: "nltk",
  spacy: "spacy",
  textblob: "textblob",
  gensim: "gensim",
  langdetect: "langdetect",
  deep_translator: "deep-translator",
  googletrans: "googletrans",
  emoji: "emoji",
  faker: "Faker",

  // web / scraping
  bs4: "beautifulsoup4",
  requests: "requests",
  httpx: "httpx",
  aiohttp: "aiohttp",
  urllib3: "urllib3",
  lxml: "lxml",
  scrapy: "scrapy",
  selenium: "selenium",
  playwright: "playwright",
  cloudscraper: "cloudscraper",
  httplib2: "httplib2",
  requests_html: "requests-html",
  fake_useragent: "fake-useragent",
  fp: "fake-useragent",

  // web frameworks
  flask: "Flask",
  flask_socketio: "Flask-SocketIO",
  flask_cors: "Flask-Cors",
  fastapi: "fastapi",
  uvicorn: "uvicorn",
  starlette: "starlette",
  sanic: "sanic",
  bottle: "bottle",
  tornado: "tornado",
  quart: "Quart",
  gunicorn: "gunicorn",
  jinja2: "Jinja2",
  django: "Django",
  rest_framework: "djangorestframework",
  socketio: "python-socketio",
  websockets: "websockets",
  websocket: "websocket-client",
  graphql: "graphql-core",
  graphene: "graphene",

  // data stores
  sqlalchemy: "SQLAlchemy",
  sqlmodel: "sqlmodel",
  psycopg2: "psycopg2-binary",
  psycopg: "psycopg[binary]",
  asyncpg: "asyncpg",
  pymysql: "PyMySQL",
  mysql: "mysql-connector-python",
  pymongo: "pymongo",
  motor: "motor",
  redis: "redis",
  aioredis: "aioredis",
  aiosqlite: "aiosqlite",
  peewee: "peewee",
  alembic: "alembic",
  boto3: "boto3",
  botocore: "botocore",
  firebase_admin: "firebase-admin",
  supabase: "supabase",
  pinecone: "pinecone-client",
  chromadb: "chromadb",
  qdrant_client: "qdrant-client",
  elasticsearch: "elasticsearch",

  // crypto / trading
  ccxt: "ccxt",
  web3: "web3",
  solana: "solana",
  eth_account: "eth-account",
  binance: "python-binance",
  crypto: "pycryptodome",
  Crypto: "pycryptodome",
  nacl: "PyNaCl",
  jwt: "PyJWT",
  jwt_: "PyJWT",
  cryptography: "cryptography",
  OpenSSL: "pyOpenSSL",
  passlib: "passlib",
  bcrypt: "bcrypt",
  coincurve: "coincurve",
  base58: "base58",

  // misc utilities
  dotenv: "python-dotenv",
  environs: "environs",
  decouple: "python-decouple",
  yaml: "PyYAML",
  toml: "toml",
  tomllib: "tomli",
  ujson: "ujson",
  orjson: "orjson",
  msgpack: "msgpack",
  simplejson: "simplejson",
  dateutil: "python-dateutil",
  pytz: "pytz",
  arrow: "arrow",
  humanize: "humanize",
  croniter: "croniter",
  apscheduler: "APScheduler",
  schedule: "schedule",
  tenacity: "tenacity",
  retrying: "retrying",
  backoff: "backoff",
  loguru: "loguru",
  rich: "rich",
  colorama: "colorama",
  termcolor: "termcolor",
  tqdm: "tqdm",
  tabulate: "tabulate",
  pyfiglet: "pyfiglet",
  art: "art",
  psutil: "psutil",
  attr: "attrs",
  attrs: "attrs",
  pydantic: "pydantic",
  pydantic_settings: "pydantic-settings",
  marshmallow: "marshmallow",
  jsonschema: "jsonschema",
  cerberus: "Cerberus",
  validator: "validator",
  phonenumbers: "phonenumbers",
  pytimeparse: "pytimeparse",
  humanfriendly: "humanfriendly",
  packaging: "packaging",
  setuptools: "setuptools",
  wheel: "wheel",
  pip: "pip",
  grpc: "grpcio",
  protobuf: "protobuf",
  google_protobuf: "protobuf",
  zmq: "pyzmq",
  pika: "pika",
  kafka: "kafka-python",
  celery: "celery",
  rq: "rq",
  dramatiq: "dramatiq",
  nest_asyncio: "nest-asyncio",
  uvloop: "uvloop",
  aiofiles: "aiofiles",
  anyio: "anyio",
  trio: "trio",
  gevent: "gevent",
  eventlet: "eventlet",
  multiprocess: "multiprocess",
  joblib: "joblib",
  cloudpickle: "cloudpickle",
  dill: "dill",
  deepdiff: "deepdiff",
  cachetools: "cachetools",
  diskcache: "diskcache",
  lru: "lru-dict",
  docstring_parser: "docstring-parser",
  typing_extensions: "typing-extensions",
  annotated_types: "annotated-types",
  six: "six",
  future: "future",
  past: "future",
  colorlog: "colorlog",
  structlog: "structlog",
  sentry_sdk: "sentry-sdk",
  posthog: "posthog",
  mixpanel: "mixpanel",
  stripe: "stripe",
  razorpay: "razorpay",
  twilio: "twilio",
  requests_toolbelt: "requests-toolbelt",
  httpx_sse: "httpx-sse",
  sseclient: "sseclient-py",
  opentelemetry: "opentelemetry-api",
  langchain: "langchain",
  langchain_openai: "langchain-openai",
  llama_index: "llama-index",
  llama_index_core: "llama-index-core",
  crewai: "crewai",
  autogen: "pyautogen",
  wikipedia: "wikipedia",
  googlesearch: "googlesearch-python",
  newsapi: "newsapi-python",
  praw: "praw",
  instabot: "instabot",
  pycountry: "pycountry",
  geopy: "geopy",
  folium: "folium",
  timezonefinder: "timezonefinder",
  holidays: "holidays",
  translate: "translate",
};

/**
 * Popular packages whose PyPI name is identical to the import name. Listing them
 * lets the analyser say "recognised" instead of asking you to double-check.
 */
const SELF_NAMED = new Set(
  `numpy pandas matplotlib scipy seaborn plotly requests httpx aiohttp urllib3 lxml selenium
  playwright tweepy praw redis pymongo boto3 celery loguru rich tqdm pytest black flake8 mypy
  ruff ipython jupyter paramiko fabric serial gpiozero psutil kafka confluent_kafka speedtest
  dns whois pytz tzlocal termcolor colorama tabulate emoji faker requests_oauthlib oauthlib
  socks stem smtplib multipart aiofiles mutagen instaloader easyocr qrcode pytube yt_dlp
  transformers datasets accelerate sentencepiece tokenizers openai anthropic cohere groq
  sqlalchemy alembic peewee asyncpg asyncpg aiosqlite httpx websockets starlette uvicorn
  strawberry graphql graphene kombu dramatiq pendulum orjson ujson msgpack simplejson
  schedule croniter tenacity backoff retrying json5 pyjwt bcrypt passlib cryptography
  pydantic marshmallow attrs cerberus jsonschema toml tomlkit dotenv decouple environs
  playwright html5lib soupsieve dateutil caldav icalendar holidays pycountry geopy folium
  yfinance ccxt web3 eth_account eth_utils coincurve base58 bitcoinlib binance stripe razorpay
  twilio slack_sdk discord telegram telebot pyrogram telethon aiogram vkbottle`.split(/\s+/)
);

/** Frameworks that must not be installed side by side. */
const CONFLICTS: Array<[string, string, string]> = [
  ["telebot", "telegram", "pyTelegramBotAPI and python-telegram-bot expose different Bot classes — make sure you really need both."],
  ["aiogram", "telegram", "aiogram and python-telegram-bot both wrap the Bot API; installing both is rarely intentional."],
  ["telebot", "aiogram", "pyTelegramBotAPI and aiogram are separate frameworks — both are installed, but check your imports."],
  ["discord", "telegram", "discord.py and a Telegram framework in one process is unusual — both will be installed."],
];

/** Telegram-style bot tokens: <digits>:<35 url-safe chars> */
const TOKEN_RE = /\b(\d{8,12}:[A-Za-z0-9_-]{30,45})\b/g;
const ENV_TOKEN_RE = /(?:BOT_TOKEN|TOKEN|API_TOKEN|TELEGRAM_TOKEN)\s*=\s*["'](\d{8,12}:[A-Za-z0-9_-]{30,45})["']/g;

const IMPORT_FROM = /^\s*from\s+([A-Za-z_][\w.]*|\.+[\w.]*)\s+import\s+(.+)$/;
const IMPORT_PLAIN = /^\s*import\s+([A-Za-z_][\w.]*(?:\s+as\s+\w+)?(?:\s*,\s*[A-Za-z_][\w.]*(?:\s+as\s+\w+)?)*)\s*(?:#.*)?$/;

export function maskToken(token: string): string {
  const [id, secret] = token.split(":");
  if (!secret) return token.slice(0, 4) + "****";
  return `${id}:${secret.slice(0, 4)}${"•".repeat(6)}${secret.slice(-3)}`;
}

interface FrameworkRule {
  id: string;
  label: string;
  pkg: string;
  pin: string;
  test: RegExp;
  note: string;
}

/** Order matters: the first match wins. */
const FRAMEWORKS: FrameworkRule[] = [
  {
    id: "ptb-v13",
    label: "python-telegram-bot v13 (legacy Updater API)",
    pkg: "python-telegram-bot",
    pin: "python-telegram-bot==13.15",
    test: /\bfrom\s+telegram\.ext\s+import[^\n]*\bUpdater\b|\bUpdater\s*\(/,
    note: "Legacy Updater API detected — pinned python-telegram-bot 13.15 so your code keeps working unchanged.",
  },
  {
    id: "ptb-v21",
    label: "python-telegram-bot v21+ (asyncio Application API)",
    pkg: "python-telegram-bot",
    pin: "python-telegram-bot>=21.6",
    test: /\bApplication(?:Builder)?\b|\bext\.Application\b/,
    note: "Modern asyncio Application API detected — pinned python-telegram-bot 21.x.",
  },
  {
    id: "pyrogram",
    label: "Pyrogram (MTProto userbot)",
    pkg: "pyrogram",
    pin: "pyrogram>=2.0.106",
    test: /\bpyrogram\b|\bid\s*=\s*["']\d+["']\s*,\s*hash\s*=/,
    note: "Pyrogram detected. TgCrypto is pre-installed for fast encryption.",
  },
  {
    id: "telethon",
    label: "Telethon (MTProto client)",
    pkg: "telethon",
    pin: "telethon>=1.36",
    test: /\bTelegramClient\b|\bfrom\s+telethon\b/,
    note: "Telethon detected — session files are persisted between restarts.",
  },
  {
    id: "aiogram-v3",
    label: "aiogram v3",
    pkg: "aiogram",
    pin: "aiogram>=3.15",
    test: /\bfrom\s+aiogram\s+import\s+[^\n]*\b(Dispatcher|Router|Bot)\b|\baiogram\.enums\b|\baiogram\.filters\b/,
    note: "aiogram v3 detected — pinned aiogram 3.x.",
  },
  {
    id: "aiogram-v2",
    label: "aiogram v2 (legacy executor API)",
    pkg: "aiogram",
    pin: "aiogram==2.25.1",
    test: /\bexecutor\.start_polling\b|\bfrom\s+aiogram\s+import\s+executor\b|\btypes\.Message\b/,
    note: "Legacy aiogram v2 executor API detected — pinned aiogram 2.25.1 so old handlers keep working.",
  },
  {
    id: "telebot",
    label: "pyTelegramBotAPI (telebot)",
    pkg: "pyTelegramBotAPI",
    pin: "pyTelegramBotAPI>=4.24",
    test: /\bimport\s+telebot\b|\bTeleBot\s*\(|\btelebot\.types\b/,
    note: "pyTelegramBotAPI detected.",
  },
  {
    id: "discord",
    label: "discord.py",
    pkg: "discord.py",
    pin: "discord.py>=2.4",
    test: /\bdiscord\.(?:Client|Intents|ext)\b|\bcommands\.Bot\s*\(/,
    note: "discord.py detected — the runner also keeps Discord gateways online 24/7.",
  },
];

const BOT_RUNTIME_HINTS: Array<{ test: RegExp; msg: string }> = [
  {
    test: /\binput\s*\(/,
    msg: "`input()` is a no-op in the cloud (stdin is closed). Use env vars or the Telegram API instead.",
  },
  {
    test: /\bcv2\.(?:imshow|waitKey)\b/,
    msg: "OpenCV GUI calls (imshow/waitKey) need a display — save images to disk or send them straight to Telegram.",
  },
  {
    test: /\bapp\.run\s*\(|\buvicorn\.run\s*\(/,
    msg: "A web server was detected. Port 8080 is public on the runner, but a Telegram bot does not need one.",
  },
  {
    test: /\bwhile\s+True\s*:(?![^\n]*await)/,
    msg: "A tight `while True:` loop can starve the asyncio loop — add `await asyncio.sleep(...)` inside it.",
  },
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function analyzeSource(source: string, extraFiles: { path: string; content: string }[] = []): Analysis {
  const lines = source.split(/\r?\n/);
  const files = [{ path: "main.py", content: source }, ...extraFiles];
  const found = new Map<string, DetectedImport>();
  const localImports = new Set<string>();

  // names defined by local files in the project -> not PyPI packages
  for (const f of extraFiles) {
    const base = f.path.replace(/^\.?\//, "").replace(/\.py$/, "").split("/")[0];
    if (base) localImports.add(base);
  }

  for (const file of files) {
    const flines = file.content.split(/\r?\n/);
    flines.forEach((raw, i) => {
      if (/^\s*#/.test(raw)) return;
      const fromMatch = raw.match(IMPORT_FROM);
      const candidates: string[] = [];
      if (fromMatch) {
        const mod = fromMatch[1];
        if (!mod.startsWith(".")) candidates.push(mod);
        else localImports.add(fromMatch[2].split(/\s+as\s+|,\s*/)[0].trim());
      } else {
        const plain = raw.match(IMPORT_PLAIN);
        if (plain) {
          for (const part of plain[1].split(",")) {
            const name = part.trim().split(/\s+as\s+/)[0].trim();
            if (name) candidates.push(name);
          }
        }
      }
      for (const rawMod of candidates) {
        const mod = rawMod.split(".")[0];
        if (!mod || mod === "*") continue;
        if (found.has(mod)) return;
        const isStd = STDLIB.has(mod);
        const dottedPkg = MODULE_TO_PKG[rawMod];
        const knownPkg = dottedPkg ?? MODULE_TO_PKG[mod];
        const pkg = knownPkg ?? (isStd ? null : mod);
        found.set(mod, {
          module: mod,
          pkg,
          stdlib: isStd,
          known: Boolean(knownPkg) || SELF_NAMED.has(mod),
          line: i + 1,
        });
      }
    });
  }

  // ---- framework detection (across entry + extra files)
  const blob = files.map((f) => f.content).join("\n");
  const detected: FrameworkRule[] = [];
  for (const rule of FRAMEWORKS) {
    if (rule.test.test(blob)) detected.push(rule);
  }
  const primary = detected[0] ?? null;

  // ---- packages
  const packages: PackageHint[] = [];
  const pushPkg = (pkg: string, reason: string, pinned = false) => {
    const existing = packages.find((p) => p.pkg.toLowerCase() === pkg.toLowerCase());
    if (existing) {
      if (pinned) {
        existing.pkg = pkg;
        existing.pinned = true;
        existing.reason = reason;
      }
      return;
    }
    packages.push({ pkg, reason, pinned });
  };

  for (const imp of found.values()) {
    if (imp.stdlib || !imp.pkg) continue;
    if (localImports.has(imp.module)) continue;
    const reason = imp.known
      ? `\`${imp.module}\` → ${imp.pkg}`
      : `\`${imp.module}\` (name matches PyPI package)`;
    // telegram/aiogram/telebot handled below with a version pin
    if (primary && imp.pkg === primary.pkg) continue;
    pushPkg(imp.pkg, reason);
  }

  if (primary) {
    pushPkg(primary.pin, `${primary.label} — auto-pinned`, true);
    if (primary.id === "pyrogram") pushPkg("TgCrypto", "Pyrogram fast crypto backend");
    if (primary.id === "telethon") pushPkg("python-socks[asyncio]", "MTProto proxy support");
  }

  // a few runtime niceties that make almost every bot more reliable
  pushPkg("python-dotenv", "env var loading (pre-installed)");
  if (/\brequests\b/.test(blob)) pushPkg("requests", "HTTP client");
  if (/\baiohttp\b/.test(blob)) pushPkg("aiohttp", "async HTTP client");

  const requirements = packages.map((p) => p.pkg).join("\n");

  // ---- tokens
  const tokens = unique([...blob.matchAll(TOKEN_RE)].map((m) => m[1]));
  const envTokens = unique([...blob.matchAll(ENV_TOKEN_RE)].map((m) => m[1]));
  const allTokens = unique([...tokens, ...envTokens]);

  // ---- warnings
  const warnings: string[] = [];
  if (allTokens.length) {
    warnings.push(
      "A bot token is hard-coded in the source. BotForge stores it encrypted at rest and masks it everywhere in the UI, but environment variables are safer."
    );
  }
  for (const hint of BOT_RUNTIME_HINTS) {
    if (hint.test.test(blob)) warnings.push(hint.msg);
  }
  if (/\b(flask|fastapi|django)\b/.test(blob) && /\.run\(|uvicorn\.run/.test(blob)) {
    warnings.push("Web framework detected: bind to 0.0.0.0:8080 so the public preview URL works.");
  }
  if (/\b(ptb|telegram)\b/i.test(blob) && !/polling|start_polling|run_polling|idle\(/i.test(blob)) {
    warnings.push("No polling/idle call found — the process may exit right after starting.");
  }
  const unresolved = [...found.values()].filter(
    (i) => !i.stdlib && !i.known && !localImports.has(i.module)
  );
  if (unresolved.length > 0) {
    warnings.push(
      `Unrecognised import${unresolved.length > 1 ? "s" : ""} (${unresolved
        .map((u) => u.module)
        .join(", ")}). Added to requirements under the same name — if ${
        unresolved.length > 1 ? "these are" : "this is"
      } your own file${unresolved.length > 1 ? "s" : ""}, add the file in the Files tab instead.`
    );
  }

  // conflicting frameworks
  for (const [a, b, msg] of CONFLICTS) {
    if (found.has(a) && found.has(b)) warnings.push(msg);
  }
  if (/\bfrom\s+\w+\s+import\b/.test(blob) === false && /import \*/.test(blob)) {
    warnings.push("`import *` detected — pin explicit names for reproducible builds.");
  }

  const notes: string[] = [];
  if (primary) notes.push(primary.note);
  notes.push(`Pre-installed baseline: pip, setuptools, wheel, python-dotenv, certifi, requests.`);

  return {
    imports: [...found.values()].sort((a, b) => a.line - b.line),
    packages,
    requirements,
    frameworks: detected.map((d) => d.label),
    framework: primary?.label ?? "Plain Python",
    frameworkId: primary?.id ?? "generic",
    tokens: allTokens,
    tokenMasked: allTokens.length ? maskToken(allTokens[0]) : null,
    warnings,
    notes,
    stats: {
      lines: lines.length,
      chars: source.length,
      imports: found.size,
      stdlib: [...found.values()].filter((i) => i.stdlib).length,
    },
    localImports: [...localImports],
  };
}

/** Parse a requirements textarea into a clean, de-duplicated list. */
export function parseRequirements(text: string): string[] {
  return unique(
    text
      .split(/\r?\n|,/)
      .map((l) => l.replace(/#.*$/, "").trim())
      .filter(Boolean)
  );
}

export const STDLIB_MODULES = STDLIB;

/**
 * Pull command names out of the most common handler decorators/registrations.
 * Used to make preview-mode logs reflect the code that was actually pasted.
 */
export function extractCommands(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /commands\s*=\s*\[([^\]]+)\]/g,              // telebot / ptb
    /CommandHandler\(\s*[\"']([A-Za-z0-9_]+)[\"']/g,
    /Command(?:s)?\(\s*[\"']([A-Za-z0-9_]+)[\"']/g, // aiogram Command("x")
    /filters\.command\(\s*[\"']([A-Za-z0-9_]+)[\"']/g,
    /handlers\.command\(\s*[\"']([A-Za-z0-9_]+)[\"']/g,
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) {
      const raw = m[1] ?? "";
      for (const part of raw.split(/[,\s]+/)) {
        const cmd = part.replace(/[\"']/g, "").trim();
        if (/^[a-z0-9_]{2,24}$/i.test(cmd)) found.add(cmd);
      }
    }
  }
  return Array.from(found).slice(0, 12);
}
