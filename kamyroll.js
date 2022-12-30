import axios from 'axios';
import localeEmoji from 'locale-emoji';
import countryMap from 'country-locale-map';
import e from 'express';

const DEVICE_TYPE = 'com.service.data';
const DEVICE_ID = 'whatvalueshouldbeforweb';
const STREAM_TYPE = 'adaptive_hls'; // adaptive_hls, adaptive_dash, drm_adaptive_dash
const SUBTITLE_FORMAT = 'vtt'; // ass, vtt, srt
const LOCALES = {
    'es-419': '🇪🇸 LatAm',
    'ar-ME': 'Arabic ME',
    'uk-UK': '🇺🇦 uk-UA',
};
const FLAG_ONLY = {
    'es-419': '🇪🇸',
    'ar-ME': '',
    'uk-UK': '🇺🇦',
};

export default {
    bearerToken: null,
    async getTitles(kitsuId) {
        let res;
        try {
            res = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}`, {
                // Brotli compression bug in latest Axios (https://github.com/axios/axios/issues/5346)
                headers: { "Accept-Encoding": "gzip,deflate,compress" },
            });
        } catch(e) {
            console.error(e.message);
            console.log(e.response.data);

            return [];
        }

        return Object.values(res.data?.data?.attributes?.titles || {});
    },
    async getSeasonCrunchyrollId(kitsuId) {
        let res;
        try {
            res = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}/streaming-links`, {
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
            id = res.data?.data?.map(link => {
                // https://crunchyroll.com/xxx
                return link?.attributes?.url?.match(/crunchyroll.com\/([^\/]+)\/?$/i)?.[1];
            }).find(value => !!value);
        }

        if (!id) {
            // get funimation slug
            id = res.data?.data?.map(link => {
                // https://www.funimation.com/shows/xxx/videos/episodes
                // https://www.funimation.com/shows/xxx/
                return link?.attributes?.url?.match(/funimation.com\/shows\/([^\/]+)/i)?.[1];
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

    async getEpisodes(mediaId, epNumber, titles = [], channelId = 'crunchyroll') {
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

        let episodes = [];
        res.data?.items?.forEach((season) => {
            episodes = [...episodes, ...season?.episodes?.filter((ep) => {
                if (ep.sequence_number !== epNumber) {
                    return false;
                }

                // check season title(s)
                return !!titles.filter(title => {
                    let kamyTitle = ep.season_title.replace(/\([a-z ]+ Dub+\)/ig, '').replace(/[^a-z0-9 ]+/ig, '').replace(/ +/ig, ' ').trim().toLowerCase();
                    let kitsuTitle = title.replace(/\([a-z ]+ Dub+\)/ig, '').replace(/[^a-z0-9 ]+/ig, '').replace(/ +/ig, ' ').trim().toLowerCase();
                    //console.log(kamyTitle, '===', kitsuTitle, kamyTitle === kitsuTitle);
                    return kamyTitle === kitsuTitle;
                }).length;
            })];
        });

        // if nothing found, try again with loose season title check
        if (!episodes.length) {
            res.data?.items?.forEach((season) => {
                episodes = [...episodes, ...season?.episodes?.filter((ep) => {
                    if (ep.sequence_number !== epNumber) {
                        return false;
                    }
    
                    // check season title(s)
                    return !!titles.filter(title => {
                        let kamyTitle = ep.season_title.replace(/\([a-z ]+ Dub+\)/ig, '').replace(/[^a-z0-9 ]+/ig, '').replace(/ +/ig, ' ').trim().toLowerCase();
                        let kitsuTitle = title.replace(/\([a-z ]+ Dub+\)/ig, '').replace(/[^a-z0-9 ]+/ig, '').replace(/ +/ig, ' ').trim().toLowerCase();
                        //console.log(kamyTitle, '==', kitsuTitle, kamyTitle === kitsuTitle);
                        return kamyTitle.includes(kitsuTitle) || kitsuTitle.includes(kamyTitle);
                    }).length;
                })];
            });
        }

        return episodes;
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
        console.log('crunchyroll season id', seasonId);

        if (!seasonId) {
            return [];
        }

        // get titles
        let titles = await this.getTitles(kitsuId);
        console.log('titles', titles);

        // get matching episodes
        const episodes = await this.getEpisodes(seasonId, epNumber, titles, 'crunchyroll');
        console.log('episodes', episodes.length);

        let result, streams = [], subtitles;
        if (!episodes.length) {
            // maybe its a movie
            result = await this.getStreamsAndSubtitles(seasonId, 'crunchyroll');
            streams.map(stream => {
                return {...stream, ep: {title: 'Movie', episode_number: 1}};
            });
            streams = result?.streams;
            subtitles = result?.subtitles;
        } else {
            // get streams for each episode
            for(const ep of episodes) {
                result = await this.getStreamsAndSubtitles(ep.id, 'crunchyroll');
                let moreStreams = result.streams.map(stream => {
                    return {...stream, ep: ep};
                });
                streams = [...streams, ...moreStreams];
                if (!subtitles) {
                    subtitles = result?.subtitles;
                }
            }
        }

        console.log('streams', streams?.length);

        if (!streams?.length) {
            return [];
        }

        subtitles = subtitles.map((sub, i) => {
            let alpha3;
            if (LOCALES?.[sub.locale]) {
                alpha3 = countryMap.getAlpha3ByAlpha2(LOCALES[sub.locale]?.replace(/[^a-z\-]+/i, '').match(/\-([a-z]{2})$/i)?.[1]);
            } else {
                alpha3 = countryMap.getAlpha3ByAlpha2(`${sub.locale}`.match(/(\-[a-z]{2})$/i)?.[1]); // TODO we should get the first part (language), instead of the second part (country): en-US
            }

            if (!alpha3) {
                return null;
            }

            return {
                id: i,
                url: sub.url,
                lang: alpha3,
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

            let audio = '';
            if (LOCALES?.[stream.audio_locale]) {
                audio = LOCALES[stream.audio_locale];
            } else if(stream.audio_locale) {
                audio = `${localeEmoji(stream.audio_locale)} ${stream.audio_locale}`;
            }

            return {
                url: stream.url,
                name: 'Crunchyroll',
                description: `Audio: ${audio}, ${subs}, ${stream.ep.title} (${stream.ep.episode_number})`,
                subtitles: subtitles,
                behaviorHints: {
                    bingeGroup: `Crunchyroll-${audio}-${subs}`,
                  },
            };
        }) || [];
    },
}
