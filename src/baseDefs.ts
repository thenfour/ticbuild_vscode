export const OUTPUT_CHANNEL_NAME = 'TIC-80 Remote';
export const DEFAULT_REMOTE_HOST = '127.0.0.1';
export const DEFAULT_REMOTE_PORT = 9977;
export const DEFAULT_POLL_HZ = 10;
export const DEFAULT_CONNECT_TIMEOUT_MS = 3000;
export const DEFAULT_UI_REFRESH_MS = 217;
export const DEFAULT_DISCOVERY_REFRESH_MS = 2500;

export const POLLER_MIN_INTERVAL_MS = 50;
export const POLLER_LOG_THROTTLE_MS = 1000;

export const CONFIG_REMOTE_HOST = 'remote.host';
export const CONFIG_REMOTE_PORT = 'remote.port';
export const CONFIG_POLL_HZ = 'pollHz';
export const CONFIG_CONNECT_TIMEOUT_MS = 'connectTimeoutMs';
export const CONFIG_UI_REFRESH_MS = 'uiRefreshMs';
export const CONFIG_DISCOVERY_REFRESH_MS = 'discoveryRefreshMs';

export const REMOTING_HELLO_V1 = 'tic-80 remoting v1';

export const DEVTOOLS_DIR_NAME = '.ticbuild';
export const DEVTOOLS_FILE_NAME = 'devtools.json';
export const DEVTOOLS_SCHEMA_FILE_NAME = 'devtools.schema.json';
export const MEMORY_WATCH_UNSUPPORTED = 'Memory watches not supported yet';

export const TICBUILD_SESSION_DIR_REL = '.ticbuild/remoting/sessions';
export const TICBUILD_SESSION_FILE_GLOB = 'tic80-remote.*.json';

export const LUA_GLOBALS_TO_IGNORE = [
    "TIC",
    "_G",
    "_VERSION",
    "assert",
    "btn",
    "btnp",
    "circ",
    "circb",
    "clip",
    "cls",
    "collectgarbage",
    "coroutine",
    "debug",
    "dofile",
    "elli",
    "ellib",
    "error",
    "exit",
    "fft",
    "ffts",
    "fget",
    "font",
    "fset",
    "getmetatable",
    "ipairs",
    "key",
    "keyp",
    "line",
    "load",
    "loadfile",
    "map",
    "math",
    "memcpy",
    "memset",
    "mget",
    "mouse",
    "mset",
    "music",
    "next",
    "package",
    "paint",
    "pairs",
    "pcall",
    "peek",
    "peek1",
    "peek2",
    "peek4",
    "pix",
    "pmem",
    "poke",
    "poke1",
    "poke2",
    "poke4",
    "print",
    "rawequal",
    "rawget",
    "rawlen",
    "rawset",
    "rect",
    "rectb",
    "require",
    "reset",
    "select",
    "setmetatable",
    "sfx",
    "spr",
    "string",
    "sync",
    "table",
    "textri",
    "time",
    "tonumber",
    "tostring",
    "trace",
    "tri",
    "trib",
    "tstamp",
    "ttri",
    "type",
    "vbank",
    "xpcall",
];