import type { GoTopic } from '../../go-course/types';
import { adTechFoundations } from './ad-tech-foundations';
import { bidRequest } from './bid-request';
import { bidResponse } from './bid-response';
import { bidderInGo } from './bidder-in-go';
import { exchangeAuction } from './exchange-auction';
import { reverseProxy } from './reverse-proxy';
import { tracking } from './tracking';
import { creativesTags } from './creatives-tags';
import { scalePrivacy } from './scale-privacy';

/** Ordered modules for the OpenRTB & Ad Platform Engineering course. */
export const OPENRTB_TOPICS: GoTopic[] = [
  adTechFoundations,
  bidRequest,
  bidResponse,
  bidderInGo,
  exchangeAuction,
  reverseProxy,
  tracking,
  creativesTags,
  scalePrivacy,
];
