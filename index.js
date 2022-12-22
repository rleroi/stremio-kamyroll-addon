import express from 'express';
import cors from 'cors';
import Mixpanel from 'mixpanel';
import swStats from 'swagger-stats';
import dotenv from 'dotenv';
dotenv.config();
import {fileURLToPath} from 'url';
import path from 'path';
import kamyroll from './kamyroll.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.static(path.join(__dirname, 'vue', 'dist')));
app.use(swStats.getMiddleware({
    name: 'pw.ers.kamyroll',
    version: process.env.npm_package_version,
    authentication: true,
    onAuthenticate: (req, username, password) => {
        return process.env.USERNAME === username && process.env.PASSWORD === password;
    }
}));

let mixpanel = null;
if(process.env.MIXPANEL_KEY) {
    mixpanel = Mixpanel.init(process.env.MIXPANEL_KEY);
}

app.get('/manifest.json', function(req, res) {
    //res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
    res.setHeader('content-type', 'application/json');

    mixpanel && mixpanel.track('install', {
        ip: req.ip,
        distinct_id: req.ip.replace(/\.|:/g, 'Z'),
    });

    res.send({
        id: 'pw.ers.kamyroll',
        logo: 'https://play-lh.googleusercontent.com/CjzbMcLbmTswzCGauGQExkFsSHvwjKEeWLbVVJx0B-J9G6OQ-UCl2eOuGBfaIozFqow',
        version: process.env.npm_package_version,
        name: 'Anime Kamyroll',
        description: 'HTTP streams directly from Crunchyroll and more. Requires Anime Kitsu Addon.',
        catalogs: [],
        resources: ['stream'],
        types: ['movie', 'series', 'anime'],
        idPrefixes: ['kitsu'],
        behaviorHints: {
            configurable: true,
        }
    });
})

// streams
app.get('/stream/:type/:id/:extra?.json', async function(req, res) {
    //res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
    res.setHeader('content-type', 'application/json');

    let kitsuId, ep;
    [kitsuId, kitsuId, ep] = req.params.id.split(':');

    const streams = await kamyroll.getStreams(kitsuId, ep);

    res.send({
        streams: streams,
    });
});


// fallback to Vue
// app.get(/.*/, (req, res) => {
//     res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
//     res.setHeader('content-type', 'text/html');
//     res.sendFile(path.join(__dirname, 'vue', 'dist', 'index.html'));
// });


kamyroll.refreshToken();
setInterval(kamyroll.refreshToken, 86400); // refresh daily

app.listen(process.env.PORT || 9000, () => {
    console.log('http://127.0.0.1:9000/manifest.json');
});
