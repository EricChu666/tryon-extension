export const STYLES = `
:host {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    color: #0f1111;
    font-size: 13px;
    line-height: 19px;
}

/* Floating Button */
#tryon-trigger-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483646; /* High z-index */
    background: #FF9900; /* Amazon Orange */
    color: white;
    border: none;
    border-radius: 24px;
    padding: 10px 20px;
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
}
#tryon-trigger-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    background: #fa8900;
}
#tryon-trigger-btn svg {
    width: 20px;
    height: 20px;
}

/* Side Panel */
#tryon-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    z-index: 2147483647; /* Highest z-index */
    box-shadow: -4px 0 16px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

#tryon-panel.open {
    transform: translateX(0);
}

/* Panel Header */
.panel-header {
    padding: 16px;
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f8f8;
}
.panel-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
}
.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #555;
    line-height: 1;
    padding: 0 8px;
}
.close-btn:hover {
    color: #111;
}

/* Panel Content */
.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

/* Product Section */
.product-section {
    margin-bottom: 24px;
}
.product-snapshot-header {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}
.product-thumb {
    width: 60px;
    height: 60px;
    object-fit: contain;
    border: 1px solid #eee;
    border-radius: 4px;
}
.product-info h3 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.product-price {
    font-size: 15px;
    color: #B12704;
    font-weight: 700;
}

/* Gallery */
.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
}
.gallery-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: contain;
    border: 1px solid #eee;
    border-radius: 2px;
    cursor: pointer;
}
.gallery-img:hover {
    border-color: #e77600;
}

/* Size Chart Table */
.size-chart-section h4 {
    margin: 16px 0 8px 0;
    font-size: 13px;
    text-transform: uppercase;
    color: #555;
    border-bottom: 2px solid #ddd;
    padding-bottom: 4px;
}

.sc-table-container {
    overflow-x: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 8px;
}
.sc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.sc-table th, .sc-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #eee;
    text-align: left;
    white-space: nowrap;
}
.sc-table th {
    background: #f2f2f2;
    font-weight: 600;
    color: #333;
}
.sc-table tr:last-child td {
    border-bottom: none;
}

.sc-meta {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
}
.pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    background: #e7f4ff;
    color: #007185;
    font-weight: 500;
    margin-right: 4px;
    border: 1px solid #cceeff;
}

/* Metrics */
.metrics-row {
    display: flex;
    gap: 16px;
    margin-top: 8px;
    padding: 12px;
    background: #fcfcfc;
    border: 1px solid #eee;
    border-radius: 4px;
}
.metric {
    flex: 1;
    text-align: center;
}
.metric-val {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: #007185;
}
.metric-label {
    font-size: 11px;
    color: #666;
}

/* Actions */
.action-bar {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #eee;
    text-align: right;
}
.btn-secondary {
    background: white;
    border: 1px solid #888;
    padding: 6px 14px;
    border-radius: 18px;
    cursor: pointer;
    font-size: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.btn-secondary:hover {
    background: #f7f7f7;
    border-color: #555;
}


/* Readiness Section */
.readiness-section {
    margin-top: 16px;
    padding: 12px;
    background: #fff;
    border: 1px solid #e7e7e7;
    border-radius: 4px;
}
.readiness-title {
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #333;
    border-bottom: 2px solid #eee;
    padding-bottom: 4px;
}
.readiness-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
}
.status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 11px;
    color: white;
    margin-right: 8px;
    min-width: 60px;
    text-align: center;
}
.status-green { background: #008a00; }
.status-yellow { background: #e3a900; color: #111; }
.status-red { background: #cc0000; }

.checklist {
    margin-top: 12px;
    border-top: 1px dashed #ddd;
    padding-top: 8px;
}
.checklist-item {
    font-size: 11px;
    color: #555;
    margin-bottom: 4px;
    display: flex;
    gap: 6px;
}
.icon-check { color: #008a00; font-weight: bold; }
.icon-cross { color: #cc0000; font-weight: bold; }

/* Debug */
.debug-section {
    margin-top: 32px;
    border-top: 1px double #ccc;
    padding-top: 12px;
}
.debug-summary {
    cursor: pointer;
    font-size: 11px;
    color: #999;
    user-select: none;
}
.debug-pre {
    background: #f4f4f4;
    padding: 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 10px;
    white-space: pre-wrap;
    overflow-x: auto;
    color: #333;
    max-height: 200px;
    overflow-y: auto;
}

/* Task 3: Static Try-On Stage */
.tryon-container {
    margin-bottom: 24px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 20px;
}
.tryon-title {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    color: #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* User Photo Section */
.user-photo-section {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}
.user-photo-thumb {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #ddd;
    background: #f0f0f0;
}
.file-input-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
}
.file-input-wrapper input[type=file] {
    font-size: 100px;
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    cursor: pointer;
}
.btn-upload {
    background: white;
    border: 1px solid #888;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    cursor: pointer;
    font-weight: 500;
}
.btn-upload:hover { background: #f7f7f7; }
.btn-remove {
    background: none;
    border: none;
    color: #cc0000;
    font-size: 11px;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    margin-left: 8px;
}

/* Try-On Stage */
.tryon-stage-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 133.33%; /* 3:4 Aspect Ratio */
    background-color: #f4f4f4;
    background-image:
        linear-gradient(45deg, #e8e8e8 25%, transparent 25%),
        linear-gradient(-45deg, #e8e8e8 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #e8e8e8 75%),
        linear-gradient(-45deg, transparent 75%, #e8e8e8 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px; 
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
}
.tryon-message {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #777;
    font-size: 13px;
    padding: 20px;
    text-align: center;
}
.stage-user-img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
}
.stage-garment-img {
    position: absolute;
    /* Centered initially, but transformed by JS */
    left: 50%;
    top: 50%;
    width: 200px; /* Base width, scaled by transform */
    height: auto;
    /* transform-origin: center center; */
    z-index: 2;
    margin-left: -100px; /* Center alignment helpers */
    margin-top: -100px; 
    pointer-events: none; /* Let clicks pass through if needed */
}

/* Controls */
.tryon-controls {
    background: #fafafa;
    border: 1px solid #eee;
    padding: 10px;
    border-radius: 4px;
}
.control-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 11px;
}
.control-row label {
    width: 50px;
    text-align: right;
    font-weight: 500;
    color: #555;
}
.control-row input[type=range] {
    flex: 1;
    cursor: pointer;
}
.control-val {
    width: 30px;
    text-align: right;
    font-family: monospace;
    color: #333;
}
.control-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
}
.btn-reset {
    font-size: 10px;
    padding: 2px 8px;
    cursor: pointer;
}
.tip-text {
    font-size: 10px;
    color: #888;
    margin-top: 8px;
    font-style: italic;
    text-align: center;
}

/* Selected Gallery Item */
.gallery-img.selected {
    border-color: #e77600;
    box-shadow: 0 0 0 2px #e77600;
}
`;
