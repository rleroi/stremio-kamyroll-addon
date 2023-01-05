import axios from "axios";
import { titlelize } from "./utils.js"
const kitsuAPI = "https://anime-kitsu.strem.fun";

async function getKitsu(name) {
  if (name !== null || undefined) {
    const url =
      kitsuAPI +
      `/catalog/series/kitsu-anime-list/search=${titlelize(name)}.json`;
    const resp = await axios.get(url).then(function (resp) {
      const filter = name.toLowerCase().includes("filme")
      ? resp.data.metas.filter((val) => val.type == "movie")
      : resp.data.metas;
    const kitsuId = filter.length ? filter[0].id : undefined;
    return kitsuId;
    })
    .catch(function (error) {
    return undefined
    })
    return resp 
  }
  return undefined
}

export { getKitsu };
