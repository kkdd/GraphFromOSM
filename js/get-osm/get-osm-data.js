"use strict";
import {generateOsmScript} from './generate-osm-script.js';
import axios from 'https://unpkg.com/axios/dist/esm/axios.min.js';

/*
--------------------------------------------------------------------------------
Send a query to https://overpass-api.de/api/interpreter and take back the
recieved data.

Input: settings object (cf to ./generate-osm-script.js)
Output: OSM data
--------------------------------------------------------------------------------
*/

const getOsmData = async (settings) => {
  const osmScript = generateOsmScript(settings);
  const response = await axios.request({
    url: 'https://overpass-api.de/api/interpreter',
    method: 'post',
    headers: { Accept: 'application/json' },
    data: osmScript,
    timeout: settings.timeout,
    maxContentLength: settings.maxContentLength
  })
  response.data.generatingScript = osmScript;
  return response.data;
}

export {getOsmData};
