import axios from 'axios';
import localeEmoji from 'locale-emoji';

const DEVICE_TYPE = 'com.service.data';
const DEVICE_ID = 'whatvalueshouldbeforweb';
const STREAM_TYPE = 'adaptive_hls'; // adaptive_hls, adaptive_dash, drm_adaptive_dash
const SUBTITLE_FORMAT = 'vtt'; // ass, vtt, srt
const LOCALES = {
    'es-419': '🇪🇸 LatAm',
    'ar-ME': '🇲🇦 ar-MA',
    'uk-UK': '🇺🇦 uk-UA',
};
const FLAG_ONLY = {
    'es-419': '🇪🇸',
    'ar-ME': '🇲🇦',
    'uk-UK': '🇺🇦',
};

export default {
    bearerToken: null,
    async getSeasonCrunchyrollId(kitsuId) {
        let res;
        try {
            res = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}/streaming-links`, {
                // Brotli compression bug in latest Axios (https://github.com/axios/axios/issues/5346)
                headers: { "Accept-Encoding": "gzip,deflate,compress" },
            });
        } catch(e) {
            console.error(e.message);
            console.log(e.response.data);

            return;
        }

        let id;
        // get vrv id
        id = res.data?.data?.map(link => {
            return link?.attributes?.url?.match(/\/series\/([^\/]+)\//i)?.[1];
        }).find(value => !!value);

        if (!id) {
            // get crunchyroll slug
            res.data?.data?.map(link => {
                return link?.attributes?.url?.match(/crunchyroll.com\/([^\/]+)$/i)?.[1];
            }).find(value => !!value);
        }

        return id;
    },

    async refreshToken() {
        let res;
        try {
            res = await axios.post('https://api.kamyroll.tech/auth/v1/token',
                {
                    "access_token": process.env.ACCESS_TOKEN,
                    "device_type": DEVICE_TYPE,
                    "device_id": DEVICE_ID,
                }, {
                    headers: { "Accept-Encoding": "gzip,deflate,compress" },
                },
            );
        } catch(e) {
            console.error('Failed to get token: ' + e.message);
            console.log(e.response.data);

            return;
        }

        this.bearerToken = res.data?.access_token;
    },

    async getEpisode(mediaId, epNumber, channelId = 'crunchyroll') {
        let res;
        try {
            res = await axios.get(`https://api.kamyroll.tech/content/v1/seasons?channel_id=${channelId}&id=${mediaId}`, {
                headers: {
                    "Accept-Encoding": "gzip,deflate,compress",
                    "Authorization": `Bearer ${this.bearerToken}`,
                },
            });
        } catch(e) {
            console.error(e.message);
            console.log(e.response.data);

            return;
        }

        let episode;
        res.data?.items?.find((season) => {
            episode = season?.episodes?.find((ep) => {
                return ep.sequence_number === epNumber;
            });
            if(episode) {
                return true;
            }
        });

        return episode;
    },

    async getStreamsAndSubtitles(mediaId, channelId = 'crunchyroll') {
        let res;
        try {
            res = await axios.get(`https://api.kamyroll.tech/videos/v1/streams?channel_id=${channelId}&id=${mediaId}&type=${STREAM_TYPE}&format=${SUBTITLE_FORMAT}`, {
                headers: {
                    "Accept-Encoding": "gzip,deflate,compress",
                    "Authorization": `Bearer ${this.bearerToken}`,
                },
            });
        } catch(e) {
            console.error(e.message);
            console.log(e.response.data);

            return {};
        }

        return res.data || {};
    },

    async getStreams(kitsuId, epNumber) {
        epNumber = Number(epNumber);

        const seasonId = await this.getSeasonCrunchyrollId(kitsuId);
        console.log('crunchyroll id', seasonId);

        if (!seasonId) {
            return [];
        }

        // series
        const episode = await this.getEpisode(seasonId, epNumber, 'crunchyroll');
        console.log('episode id', episode?.id);

        let result, streams, subtitles;
        if (!episode) {
            // maybe its a movie?
            result = await this.getStreamsAndSubtitles(episode.id, 'crunchyroll');
            streams = result?.streams;
            subtitles = result?.subtitles;

            if (!streams?.length) {
                return [];
            }
        } else {
            result = await this.getStreamsAndSubtitles(episode.id, 'crunchyroll');
            streams = result?.streams;
            subtitles = result?.subtitles;
        }

        console.log('streams', streams?.length);

        if (!streams) {
            return [];
        }

        subtitles = subtitles.map((sub, i) => {
            let lang;
            if (LOCALES?.[sub.locale]) {
                lang = LOCALES?.[sub.locale];
            } else {
                lang = `${localeEmoji(sub.locale)} ${sub.locale}`;
            }

            return {
                id: i,
                url: sub.url,
                lang: lang,
            };
        }).filter(val => !!val);

        return streams.map((stream) => {
            let subs = '';
            if (LOCALES?.[stream.hardsub_locale]) {
                subs = `Hardsub: ${LOCALES[stream.hardsub_locale]}`;
            } else if(stream.hardsub_locale) {
                subs = `Hardsub: ${localeEmoji(stream.hardsub_locale)} ${stream.hardsub_locale}`;
            }

            if (!subs) {
                subs = subtitles.length ? 'Multi-Sub: ' + result.subtitles.map((sub) => {
                    return FLAG_ONLY?.[sub.locale] || (sub.locale ? localeEmoji(sub.locale) : '');
                }).join(' ') : 'No subs'
            }

            return {
                url: stream.url,
                name: 'Crunchyroll',
                description: `Audio: ${localeEmoji(stream.audio_locale)} ${stream.audio_locale}, ${subs}, ${episode.title} (${episode.episode_number})`,
                subtitles: subtitles,
            };
        }) || [];
    },
}