import axios from 'axios';

const ACCESS_TOKEN = 'HMbQeThWmZq4t7w';
const DEVICE_TYPE = 'com.service.data';
const DEVICE_ID = 'whatvalueshouldbeforweb';
const STREAM_TYPE = 'adaptive_hls';
const SUBTITLE_FORMAT = 'srt';

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
                    "access_token": ACCESS_TOKEN,
                    "device_type": DEVICE_TYPE,
                    "device_id": DEVICE_ID,
                }, {
                    headers: { "Accept-Encoding": "gzip,deflate,compress" },
                },
            );
        } catch(e) {
            console.error(e.message);
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

    async getStreamUrls(mediaId, channelId = 'crunchyroll') {
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

            return [];
        }

        return res.data?.streams || [];
    },

    async getStreams(kitsuId, epNumber) {
        epNumber = Number(epNumber);

        let seasonId = await this.getSeasonCrunchyrollId(kitsuId);
        console.log('crunchyroll id', seasonId);

        if (!seasonId) {
            return [];
        }

        let episode = await this.getEpisode(seasonId, epNumber, 'crunchyroll');

        console.log('episode id', episode.id);

        if (!episode) {
            return [];
        }

        let streams = await this.getStreamUrls(episode.id, 'crunchyroll');

        console.log('streams', streams.length);

        if (!streams) {
            return [];
        }

        return streams.map((stream) => {
            return {
                url: stream.url,
                name: 'Crunchyroll',
                description: `Audio: ${stream.audio_locale}, Hardsub: ${stream.hardsub_locale || 'no'}, ${episode.title} (${episode.episode_number})`
            };
        }) || [];
    },
}