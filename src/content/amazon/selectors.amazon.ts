// src/content/amazon/selectors.amazon.ts
export const AMAZON_SELECTORS = {
    title: ["#productTitle", "#title"],
    brand: ["#bylineInfo", ".po-brand .a-span9 .a-size-base", ".a-brand"],
    price: [
        // common desktop price blocks
        "#corePriceDisplay_desktop_feature_div .a-offscreen",
        "#corePrice_feature_div .a-offscreen",
        "#apex_desktop .a-offscreen",
        "#apex_desktop_newAccordionRow .a-offscreen",

        // older ids
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#price_inside_buybox",

        // generic fallbacks
        ".a-price.aok-align-center .a-offscreen",
        ".a-price .a-offscreen"
    ],
    bulletPoints: ["#feature-bullets ul li span", "#featurebullets_feature_div ul li span"],
    description: ["#productDescription", "#aplus", "#bookDescription_feature_div"],
    imageMain: ["#landingImage", "#imgTagWrapperId img"],
    imageThumbs: ["#altImages img"],
    sizeChartTriggers: [
        // buttons/links that open size chart
        'a[href*="sizechart"]',
        'a[href*="SizeChart"]',
        '#a-autoid-*_announce:contains("Size chart")', // may not work in querySelector; handled via text scan
        'span:contains("Size chart")'                  // may not work; handled via text scan
    ],
    sizeChartTables: [
        // common containers that may include size chart tables
        '#sizeChart',
        '#a-popover-content-1',
        '.a-popover-content',
        'table'
    ]

} as const;
