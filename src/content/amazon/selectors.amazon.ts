// src/content/amazon/selectors.amazon.ts
export const AMAZON_SELECTORS = {
    title: ["#productTitle", "#title"],
    brand: ["#bylineInfo", ".po-brand .a-span9 .a-size-base", ".a-brand"],
    price: [
        "#corePriceDisplay_desktop_feature_div .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price .a-offscreen"
    ],
    bulletPoints: ["#feature-bullets ul li span", "#featurebullets_feature_div ul li span"],
    description: ["#productDescription", "#aplus", "#bookDescription_feature_div"],
    imageMain: ["#landingImage", "#imgTagWrapperId img"],
    imageThumbs: ["#altImages img"]
} as const;
