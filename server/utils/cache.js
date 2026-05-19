const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

cache.delByPrefix = (prefix) => {
    const keys = cache.keys().filter(k => k.startsWith(prefix));
    if (keys.length) cache.del(keys);
};

module.exports = cache;
