# Pro Metronome — 可編程練習節拍器

一款基於瀏覽器的可編程練習節拍器，提供預設庫、節奏編輯器與極簡演出模式。全部邏輯於前端運行，無需後端伺服器。

## 技術棧

| 層級 | 技術 |
|------|------|
| UI 框架 | React 19 (JSX) |
| 建構工具 | Vite 8 |
| 樣式 | Tailwind CSS 3 + PostCSS + Autoprefixer |
| 狀態管理 | Zustand 5 |
| 音訊 | Web Audio API |
| 設計風格 | Material Design 3 |

## 功能特色

### 三大檢視模式

**預設庫 (Presets)**
- 內建經典節奏預設（標準 4/4、複合 6/8 等）
- 自訂節奏的儲存、收藏與刪除
- 依名稱或標籤搜尋，依拍號篩選
- 最近使用記錄（最多 10 筆）
- 底部狀態列顯示當前 BPM、拍號、經過時間與小節數

**編輯器 (Editor)**
- BPM 控制：範圍 20–300，支援滑桿、按鈕微調與直接輸入，並顯示速度名稱（Largo、Andante、Allegro、Presto 等）
- Tap Tempo：透過連續點擊自動計算 BPM
- 拍號設定：內建常用拍號（4/4、3/4、6/8、5/4、7/8、2/4）及自訂拍號
- 節奏編輯：以小節 → 拍 → 細分音符的階層結構編輯節奏型態
- 兩種編輯模式：
  - **Grid 模式**：比例式時間軸，點擊切換重音等級，搭配混音面板
  - **Beats 模式**：逐拍編輯細分音符，提供容量條與溢出警告
- 重音系統：強 / 中 / 普通 / 靜音四級重音
- 支援附點音符與連結線（Tie）
- 播放限制：所有拍的細分音符必須恰好填滿，才能開始播放（防止節拍漂移）
- 匯出 JSON 檔案以保存節奏型態

**演出模式 (Performance)**
- 極簡舞台介面，大字顯示 BPM
- 圓形節拍器 UI，顯示細分音符點與分數標記
- 點擊圓形區域即可播放/暫停
- 底部顯示拍號、小節數與計時器

### 音訊引擎

- 基於 Web Audio API 的前瞻排程器（25ms 前瞻，100ms 預排程）
- 四種音色：木魚（預設）、電子、邊鼓、嗶聲
- 獨立重音音量控制與主音量控制
- 播放中可即時更新 BPM、音量與排程參數
- 支援暫停/恢復/停止

### 節奏理論模型

- 以 480 ticks 為一個四分音符的精度
- 支援全音符至三十二分音符，以及三連音
- 完整的拍容量驗證系統，確保節奏型態的正確性

## 安裝與使用

### 環境需求

- [Node.js](https://nodejs.org/)（附帶 npm）

### 安裝步驟

```bash
git clone <repository-url>
cd Metronome_practice
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 Vite 顯示的網址（預設為 **http://localhost:5173/**）。

> **注意：** 瀏覽器的 AudioContext 政策要求使用者必須先與頁面互動（例如點擊）才能播放音訊。

### 其他指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器（支援熱更新） |
| `npm run build` | 建構生產版本至 `dist/` 目錄 |
| `npm run preview` | 本地預覽生產版本 |
| `npm run lint` | 執行 ESLint 程式碼檢查 |

## 專案結構

```
src/
├── main.jsx                  # React 根節點
├── App.jsx                   # 檢視切換（presets / editor / performance）
├── App.css                   # 應用級樣式
├── index.css                 # Tailwind + MD3 元件樣式
├── engine/
│   ├── musicTheory.js        # Tick 計算、驗證、播放條目生成
│   └── audioEngine.js        # Web Audio 單例排程器
├── hooks/
│   ├── useMetronome.js       # 播放/暫停/停止 傳輸控制
│   └── useTapTempo.js        # Tap Tempo BPM 計算
├── store/
│   └── metronomeStore.js     # Zustand 集中狀態管理
├── pages/
│   ├── PresetsPage.jsx       # 預設庫頁面
│   ├── EditorPage.jsx        # 節奏編輯器頁面
│   └── PerformancePage.jsx   # 演出模式頁面
└── components/
    ├── LibraryMenu.jsx       # 預設庫導覽選單
    ├── BpmControl.jsx        # BPM 控制元件 + Tap Tempo
    ├── TimeSignatureControl.jsx  # 拍號設定元件
    ├── SubdivisionEditor.jsx # 逐拍細分音符編輯器
    ├── SequenceGrid.jsx      # 比例式時間軸格線
    ├── MixerPanel.jsx        # 混音面板（音量、音色）
    ├── PlaybackControls.jsx  # 播放控制按鈕與統計
    ├── BeatIndicator.jsx     # 拍號指示燈
    ├── PresetCard.jsx        # 預設卡片元件
    └── Icon.jsx              # Material Symbols 圖示封裝
```

## 資料模型

```
timeSignature: { beats, noteValue }
measures: [
  {
    id,
    beats: [
      {
        id,
        subdivisions: [
          { id, value, dotted, tie, accent }
        ],
        carryOver
      }
    ]
  }
]
```

- **value**：音符時值（quarter、eighth、sixteenth 等）
- **dotted**：是否為附點音符
- **tie**：是否與下一音符連結
- **accent**：重音等級（strong / medium / normal / none）

## 使用流程

1. **開啟應用** — 預設進入預設庫頁面
2. **選擇或建立節奏** — 載入內建預設，或點擊「New Preset」從空白 4/4 開始
3. **編輯節奏** — 在編輯器中調整 BPM、拍號、細分音符與重音
4. **試聽** — 當所有拍的音符填滿後，點擊播放按鈕試聽
5. **儲存** — 儲存為預設或匯出 JSON 檔案
6. **演出** — 切換至演出模式，使用極簡介面搭配練習或表演

## 注意事項

- 所有資料僅保存於瀏覽器記憶體中，**重新整理頁面會遺失自訂預設**。請使用「Export JSON」功能匯出備份。
- 切換拍號會**重設**為一個預設小節。
- 離開編輯器或演出模式會自動停止音訊並重設播放狀態。
- 預設 BPM 為 120，拍號為 4/4，音色為木魚，主音量 0.8。

## 授權

本專案僅供學習與練習使用。
