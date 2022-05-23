import axios, { AxiosInstance } from 'axios';
import rateLimit from 'axios-rate-limit';
import torAxios from 'tor-axios';

type RefreshIpAddressFunction = () => Promise<void> | void;
let refreshingIp = false;

export function createHttpClient(): {
  http: AxiosInstance;
  refreshIpAddress: RefreshIpAddressFunction;
} {
  const torEnabled = process.env.TOR_ENABLED === 'true';
  if (torEnabled) {
    const tor = torAxios.torSetup({
      ip: process.env.TOR_HOST,
      port: process.env.TOR_PORT,
      controlPort: process.env.TOR_CONTROL_PORT,
      controlPassword: process.env.TOR_CONTROL_PASWORD,
    });

    const http = axios.create({
      httpAgent: tor.httpAgent(),
      httpsAgent: tor.httpsAgent(),
    });

    const refreshIpAddress = async () => {
      try {
        if (refreshingIp) {
          // console.log('IP refresh already in progress');
          return;
        }
        refreshingIp = true;
        // console.log('Refreshing IP address');
        tor.torNewSession();
      } catch (e) {
        // console.error('Refresh IP address failed', e);
      } finally {
        refreshingIp = false;
      }
    };

    return {
      http,
      refreshIpAddress,
    };
  } else {
    const http = rateLimit(axios.create(), { maxRPS: 6, perMilliseconds: 1000 });

    return {
      http,
      refreshIpAddress: () => {
        //
      },
    };
  }
}
