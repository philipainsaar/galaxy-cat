'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const CAT_MODEL_URL = '/models/alien-cat.glb';
const BOAT_MODEL_URL = '/models/cosmic-boat.glb';
const FLOAT_RING_MODEL_URL = '/models/float-ring.glb';
const FLOAT_RING_FALLBACK_MODEL_URL = '/models/floatring.glb';
const SPARKLE_HEART_MODEL_URL = '/models/SparkleHeart_LowPoly.glb';
const TRANSLATE_LANGUAGE_OPTIONS = [
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', short: 'SV', flag: '/images/flags/flag-sweden.png' },
  { code: 'en', name: 'English', nativeName: 'English', short: 'EN', flag: '/images/flags/flag-united-kingdom.png' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', short: 'JA', flag: '/images/flags/flag-japan.png' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', short: 'KO', flag: '/images/flags/flag-south-korea.png' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', short: 'ZH', flag: '/images/flags/flag-china.png' },
  { code: 'fr', name: 'French', nativeName: 'Français', short: 'FR', flag: '/images/flags/flag-france.png' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', short: 'DE', flag: '/images/flags/flag-germany.png' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', short: 'ES', flag: '/images/flags/flag-spain.png' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', short: 'IT', flag: '/images/flags/flag-italy.png' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', short: 'PT', flag: '/images/flags/flag-portugal.png' },
];

const DEFAULT_LANGUAGE_CODE = 'en';
const SITE_TRANSLATIONS = {
  "sv": {
    "languageNativeName": "Svenska",
    "logoAlt": "Almost Made in Japan",
    "translate": "Översätt",
    "translateTo": "Översätt till {language}",
    "translateToLanguage": "Översätt till {language}",
    "closeTranslatePopup": "Stäng översättningsfönster",
    "chooseTranslationLanguage": "Välj översättningsspråk",
    "chooseLanguage": "Välj språk",
    "loadingGlossyJewelry": "Laddar glansigt smycke...",
    "couldNotLoadGlb": "Kunde inte ladda GLB",
    "introLine1": "EN ALIENKATT KOM",
    "introLine2": "FÖR ATT HÄMTA DIG TILL SHOPPING",
    "enterWebsite": "Gå in på webbplatsen",
    "enterPortal": "GÅ IN I PORTALEN?",
    "entering": "GÅR IN...",
    "dragHint": "↑ dra alienkatten till båten ↑",
    "loadingTicker": "Ansluter till CYBER-NÄTVERKET...",
    "loadingTitle": "LADDAR...",
    "collectionsTitle": "KOLLEKTIONER",
    "openCollection": "Öppna {title}",
    "modelLoadError": "MODELLFEL VID LADDNING",
    "close": "STÄNG",
    "modelErrorBody1": "Filerna kan finnas, men modellinställningen kan ändå misslyckas.",
    "modelErrorBody2": "Öppna webbläsarkonsolen för exakt fel.",
    "ringTerminalMessage": "• Modellering: £50 per timme.\n\n• Make-up: £50\n\n• Styling: £50\n\n• Videoredigering: £15 per video.\n\n• Art Director: £150",
    "collectionNames": {
      "dreamy": "DRÖM",
      "emo": "EMO",
      "nature": "NATUR",
      "cyber": "CYBER"
    }
  },
  "en": {
    "languageNativeName": "English",
    "logoAlt": "Almost Made in Japan",
    "translate": "Translate",
    "translateTo": "Translate to {language}",
    "translateToLanguage": "Translate to {language}",
    "closeTranslatePopup": "Close translate popup",
    "chooseTranslationLanguage": "Choose translation language",
    "chooseLanguage": "Choose language",
    "loadingGlossyJewelry": "Loading glossy jewelry...",
    "couldNotLoadGlb": "Could not load GLB",
    "introLine1": "AN ALIEN CAT HAS COME",
    "introLine2": "TO COLLECT YOU FOR SHOPPING",
    "enterWebsite": "Enter the website",
    "enterPortal": "CLICK HERE TO\n\nENTER THE PORTAL",
    "entering": "ENTERING...",
    "dragHint": "↑ place the alien cat on the boat ↑",
    "loadingTicker": "Connecting to the CYBER-NETWORK...",
    "loadingTitle": "LOADING...",
    "collectionsTitle": "WHICH PLANET DO YOU\n\nWANT TO LAND FIRST?",
    "openCollection": "Open {title}",
    "modelLoadError": "MODEL LOAD ERROR",
    "close": "CLOSE",
    "modelErrorBody1": "The files may exist, but model setup can still fail.",
    "modelErrorBody2": "Open the browser console for the exact error.",
    "ringTerminalMessage": "• Modeling: £50 an hour.\n\n• Make-up: £50\n\n• Styling: £50\n\n• Video editing: £15 per video.\n\n• Art Director: £150",
    "collectionNames": {
      "dreamy": "DREAMY",
      "emo": "EMO",
      "nature": "NATURE",
      "cyber": "CYBER"
    }
  },
  "ja": {
    "languageNativeName": "日本語",
    "logoAlt": "Almost Made in Japan",
    "translate": "翻訳",
    "translateTo": "{language}へ翻訳",
    "translateToLanguage": "{language}へ翻訳",
    "closeTranslatePopup": "翻訳ウィンドウを閉じる",
    "chooseTranslationLanguage": "翻訳する言語を選択",
    "chooseLanguage": "言語を選択",
    "loadingGlossyJewelry": "光るジュエリーを読み込み中...",
    "couldNotLoadGlb": "GLBを読み込めませんでした",
    "introLine1": "宇宙から猫が君をお買い物に連れて行くためにやって来たよ！",
    "introLine2": "",
    "enterWebsite": "ここをクリックして入口に入ってね",
    "enterPortal": "ここをクリックして入口に入ってね",
    "entering": "入っています...",
    "dragHint": "↑ 宇宙猫を船まで指で持っていってね ↑",
    "loadingTicker": "サイバーネットワークに接続中...",
    "loadingTitle": "読み込み中...",
    "collectionsTitle": "どの星に着陸しますか？",
    "openCollection": "{title}を開く",
    "modelLoadError": "モデル読み込みエラー",
    "close": "閉じる",
    "modelErrorBody1": "ファイルが存在していても、モデル設定で失敗する場合があります。",
    "modelErrorBody2": "正確なエラーはブラウザのコンソールで確認してください。",
    "ringTerminalMessage": "• モデリング：1時間 £50\n\n• メイクアップ：£50\n\n• スタイリング：£50\n\n• 動画編集：1本 £15\n\n• アートディレクター：£150",
    "collectionNames": {
      "dreamy": "ドリーミー",
      "emo": "エモ",
      "nature": "ネイチャー",
      "cyber": "サイバー"
    }
  },
  "ko": {
    "languageNativeName": "한국어",
    "logoAlt": "Almost Made in Japan",
    "translate": "번역",
    "translateTo": "{language}로 번역",
    "translateToLanguage": "{language}로 번역",
    "closeTranslatePopup": "번역 창 닫기",
    "chooseTranslationLanguage": "번역 언어 선택",
    "chooseLanguage": "언어 선택",
    "loadingGlossyJewelry": "반짝이는 주얼리 로딩 중...",
    "couldNotLoadGlb": "GLB를 불러올 수 없습니다",
    "introLine1": "외계 고양이가 왔어요",
    "introLine2": "당신을 쇼핑으로 데려가려고",
    "enterWebsite": "웹사이트 들어가기",
    "enterPortal": "포털에 들어갈까요?",
    "entering": "들어가는 중...",
    "dragHint": "↑ 외계 고양이를 보트로 드래그 ↑",
    "loadingTicker": "CYBER-NETWORK에 연결 중...",
    "loadingTitle": "로딩 중...",
    "collectionsTitle": "컬렉션",
    "openCollection": "{title} 열기",
    "modelLoadError": "모델 로드 오류",
    "close": "닫기",
    "modelErrorBody1": "파일이 있어도 모델 설정은 실패할 수 있습니다.",
    "modelErrorBody2": "정확한 오류는 브라우저 콘솔에서 확인하세요.",
    "ringTerminalMessage": "• 모델링: 시간당 £50\n\n• 메이크업: £50\n\n• 스타일링: £50\n\n• 영상 편집: 영상당 £15\n\n• 아트 디렉터: £150",
    "collectionNames": {
      "dreamy": "드리미",
      "emo": "이모",
      "nature": "네이처",
      "cyber": "사이버"
    }
  },
  "zh": {
    "languageNativeName": "中文",
    "logoAlt": "Almost Made in Japan",
    "translate": "翻译",
    "translateTo": "翻译成{language}",
    "translateToLanguage": "翻译成{language}",
    "closeTranslatePopup": "关闭翻译窗口",
    "chooseTranslationLanguage": "选择翻译语言",
    "chooseLanguage": "选择语言",
    "loadingGlossyJewelry": "正在加载闪亮珠宝...",
    "couldNotLoadGlb": "无法加载 GLB",
    "introLine1": "外星猫猫来接你购物啦！",
    "introLine2": "",
    "enterWebsite": "点击这里进入时空传送门",
    "enterPortal": "点击这里进入时空传送门",
    "entering": "正在进入...",
    "dragHint": "↑ 请带领外星猫猫登上飞船 ↑",
    "loadingTicker": "正在接入赛博网络...",
    "loadingTitle": "加载中...",
    "collectionsTitle": "你想先登陆哪颗星球吖？",
    "openCollection": "打开{title}",
    "modelLoadError": "模型加载错误",
    "close": "关闭",
    "modelErrorBody1": "文件可能存在，但模型设置仍然可能失败。",
    "modelErrorBody2": "请打开浏览器控制台查看准确错误。",
    "ringTerminalMessage": "• 建模：每小时 £50\n\n• 化妆：£50\n\n• 造型：£50\n\n• 视频剪辑：每个视频 £15\n\n• 艺术指导：£150",
    "collectionNames": {
      "dreamy": "梦幻",
      "emo": "EMO",
      "nature": "自然",
      "cyber": "赛博"
    }
  },
  "fr": {
    "languageNativeName": "Français",
    "logoAlt": "Almost Made in Japan",
    "translate": "Traduire",
    "translateTo": "Traduire en {language}",
    "translateToLanguage": "Traduire en {language}",
    "closeTranslatePopup": "Fermer la fenêtre de traduction",
    "chooseTranslationLanguage": "Choisir la langue de traduction",
    "chooseLanguage": "Choisir une langue",
    "loadingGlossyJewelry": "Chargement du bijou brillant...",
    "couldNotLoadGlb": "Impossible de charger le GLB",
    "introLine1": "UN CHAT ALIEN EST VENU",
    "introLine2": "TE CHERCHER POUR FAIRE DU SHOPPING",
    "enterWebsite": "Entrer sur le site",
    "enterPortal": "ENTRER DANS LE PORTAIL ?",
    "entering": "ENTRÉE...",
    "dragHint": "↑ fais glisser le chat alien vers le bateau ↑",
    "loadingTicker": "Connexion au CYBER-RÉSEAU...",
    "loadingTitle": "CHARGEMENT...",
    "collectionsTitle": "COLLECTIONS",
    "openCollection": "Ouvrir {title}",
    "modelLoadError": "ERREUR DE CHARGEMENT DU MODÈLE",
    "close": "FERMER",
    "modelErrorBody1": "Les fichiers peuvent exister, mais la configuration du modèle peut encore échouer.",
    "modelErrorBody2": "Ouvre la console du navigateur pour voir l’erreur exacte.",
    "ringTerminalMessage": "• Modélisation : £50 de l’heure.\n\n• Maquillage : £50\n\n• Stylisme : £50\n\n• Montage vidéo : £15 par vidéo.\n\n• Directeur artistique : £150",
    "collectionNames": {
      "dreamy": "RÊVE",
      "emo": "EMO",
      "nature": "NATURE",
      "cyber": "CYBER"
    }
  },
  "de": {
    "languageNativeName": "Deutsch",
    "logoAlt": "Almost Made in Japan",
    "translate": "Übersetzen",
    "translateTo": "Ins {language} übersetzen",
    "translateToLanguage": "Ins {language} übersetzen",
    "closeTranslatePopup": "Übersetzungsfenster schließen",
    "chooseTranslationLanguage": "Übersetzungssprache wählen",
    "chooseLanguage": "Sprache wählen",
    "loadingGlossyJewelry": "Glänzendes Schmuckstück wird geladen...",
    "couldNotLoadGlb": "GLB konnte nicht geladen werden",
    "introLine1": "EINE ALIEN-KATZE KAM",
    "introLine2": "UM DICH ZUM SHOPPING ABZUHOLEN",
    "enterWebsite": "Website betreten",
    "enterPortal": "DAS PORTAL BETRETEN?",
    "entering": "BETRETE...",
    "dragHint": "↑ zieh die Alien-Katze zum Boot ↑",
    "loadingTicker": "Verbindung zum CYBER-NETWORK...",
    "loadingTitle": "LÄDT...",
    "collectionsTitle": "KOLLEKTIONEN",
    "openCollection": "{title} öffnen",
    "modelLoadError": "MODELL-LADEFEHLER",
    "close": "SCHLIESSEN",
    "modelErrorBody1": "Die Dateien können vorhanden sein, aber die Modelleinrichtung kann trotzdem fehlschlagen.",
    "modelErrorBody2": "Öffne die Browser-Konsole für den genauen Fehler.",
    "ringTerminalMessage": "• Modeling: £50 pro Stunde.\n\n• Make-up: £50\n\n• Styling: £50\n\n• Videobearbeitung: £15 pro Video.\n\n• Art Director: £150",
    "collectionNames": {
      "dreamy": "TRÄUMERISCH",
      "emo": "EMO",
      "nature": "NATUR",
      "cyber": "CYBER"
    }
  },
  "es": {
    "languageNativeName": "Español",
    "logoAlt": "Almost Made in Japan",
    "translate": "Traducir",
    "translateTo": "Traducir a {language}",
    "translateToLanguage": "Traducir a {language}",
    "closeTranslatePopup": "Cerrar ventana de traducción",
    "chooseTranslationLanguage": "Elegir idioma de traducción",
    "chooseLanguage": "Elegir idioma",
    "loadingGlossyJewelry": "Cargando joya brillante...",
    "couldNotLoadGlb": "No se pudo cargar el GLB",
    "introLine1": "UN GATO ALIENÍGENA VINO",
    "introLine2": "A RECOGERTE PARA IR DE COMPRAS",
    "enterWebsite": "Clica aquí para entrar al portal",
    "enterPortal": "Clica aquí para entrar al portal",
    "entering": "ENTRANDO...",
    "dragHint": "↑ coloca al gato alienígena donde el barco ↑",
    "loadingTicker": "Conectándose a la red cibernética...",
    "loadingTitle": "CARGANDO...",
    "collectionsTitle": "¿En qué planeta te gustaría aterrizar primero?",
    "openCollection": "Abrir {title}",
    "modelLoadError": "ERROR AL CARGAR EL MODELO",
    "close": "CERRAR",
    "modelErrorBody1": "Los archivos pueden existir, pero la configuración del modelo aún puede fallar.",
    "modelErrorBody2": "Abre la consola del navegador para ver el error exacto.",
    "ringTerminalMessage": "• Modelaje: £50 por hora.\n\n• Maquillaje: £50\n\n• Estilismo: £50\n\n• Edición de video: £15 por video.\n\n• Director de arte: £150",
    "collectionNames": {
      "dreamy": "ENSUEÑO",
      "emo": "EMO",
      "nature": "NATURALEZA",
      "cyber": "CYBER"
    }
  },
  "it": {
    "languageNativeName": "Italiano",
    "logoAlt": "Almost Made in Japan",
    "translate": "Traduci",
    "translateTo": "Traduci in {language}",
    "translateToLanguage": "Traduci in {language}",
    "closeTranslatePopup": "Chiudi finestra di traduzione",
    "chooseTranslationLanguage": "Scegli lingua di traduzione",
    "chooseLanguage": "Scegli lingua",
    "loadingGlossyJewelry": "Caricamento gioiello lucido...",
    "couldNotLoadGlb": "Impossibile caricare GLB",
    "introLine1": "È ARRIVATO UN GATTO ALIENO",
    "introLine2": "PER PORTARTI A FARE SHOPPING",
    "enterWebsite": "Entra nel sito",
    "enterPortal": "ENTRARE NEL PORTALE?",
    "entering": "ENTRO...",
    "dragHint": "↑ trascina il gatto alieno sulla barca ↑",
    "loadingTicker": "Connessione alla CYBER-NETWORK...",
    "loadingTitle": "CARICAMENTO...",
    "collectionsTitle": "COLLEZIONI",
    "openCollection": "Apri {title}",
    "modelLoadError": "ERRORE DI CARICAMENTO MODELLO",
    "close": "CHIUDI",
    "modelErrorBody1": "I file possono esistere, ma la configurazione del modello può comunque fallire.",
    "modelErrorBody2": "Apri la console del browser per l’errore esatto.",
    "ringTerminalMessage": "• Modellazione: £50 all’ora.\n\n• Make-up: £50\n\n• Styling: £50\n\n• Montaggio video: £15 per video.\n\n• Art Director: £150",
    "collectionNames": {
      "dreamy": "SOGNO",
      "emo": "EMO",
      "nature": "NATURA",
      "cyber": "CYBER"
    }
  },
  "pt": {
    "languageNativeName": "Português",
    "logoAlt": "Almost Made in Japan",
    "translate": "Traduzir",
    "translateTo": "Traduzir para {language}",
    "translateToLanguage": "Traduzir para {language}",
    "closeTranslatePopup": "Fechar janela de tradução",
    "chooseTranslationLanguage": "Escolher idioma de tradução",
    "chooseLanguage": "Escolher idioma",
    "loadingGlossyJewelry": "Carregando joia brilhante...",
    "couldNotLoadGlb": "Não foi possível carregar o GLB",
    "introLine1": "Um gato extraterrestre veio",
    "introLine2": "para te levar às compras",
    "enterWebsite": "Clica aqui para entrares no portal",
    "enterPortal": "Clica aqui para entrares no portal",
    "entering": "ENTRANDO...",
    "dragHint": "↑ Coloca o gato extraterrestre no barco ↑",
    "loadingTicker": "A ligar à rede informática...",
    "loadingTitle": "CARREGANDO...",
    "collectionsTitle": "Em que planeta queres aterrar primeiro?",
    "openCollection": "Abrir {title}",
    "modelLoadError": "ERRO AO CARREGAR MODELO",
    "close": "FECHAR",
    "modelErrorBody1": "Os arquivos podem existir, mas a configuração do modelo ainda pode falhar.",
    "modelErrorBody2": "Abra o console do navegador para ver o erro exato.",
    "ringTerminalMessage": "• Modelagem: £50 por hora.\n\n• Maquiagem: £50\n\n• Styling: £50\n\n• Edição de vídeo: £15 por vídeo.\n\n• Diretor de arte: £150",
    "collectionNames": {
      "dreamy": "SONHO",
      "emo": "EMO",
      "nature": "NATUREZA",
      "cyber": "CYBER"
    }
  }
};

const getSiteCopy = (languageCode) =>
  SITE_TRANSLATIONS[languageCode] || SITE_TRANSLATIONS[DEFAULT_LANGUAGE_CODE];

const formatCopy = (template, values = {}) =>
  String(template || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

const getDocumentLangCode = (languageCode) => {
  if (languageCode === 'zh') return 'zh-CN';
  if (languageCode === 'pt') return 'pt-PT';
  return languageCode || DEFAULT_LANGUAGE_CODE;
};


const CORE_MODEL_PRELOAD_URLS = [
  CAT_MODEL_URL,
  BOAT_MODEL_URL,
  FLOAT_RING_MODEL_URL,
];

// These are all the GLB files currently shipped in /public/models.
// Cat + boat are highest priority because the main scene needs them first.
const ALL_PUBLIC_GLB_PRELOAD_URLS = [
  CAT_MODEL_URL,
  BOAT_MODEL_URL,
  FLOAT_RING_MODEL_URL,
  FLOAT_RING_FALLBACK_MODEL_URL,
  SPARKLE_HEART_MODEL_URL,
  '/models/galaxy-bag.glb',
  '/models/pastel-looping-animated-water.glb',
];

const PUBLIC_IMAGE_PRELOAD_URLS = [
  '/images/pastel-sky.jpg',
  '/images/pastel-sky.png',
  '/images/water-texture.jpg',
  '/images/almostmadeinjapan.png',
  '/images/covers/dreamy.jpg',
  '/images/covers/emo.jpg',
  '/images/covers/nature.jpg',
  '/images/covers/cyber.jpg',
  '/images/symbols/pink-star-brooch.png',
  '/images/symbols/pearl-planet.png',
  '/images/symbols/fluffy-purple-star.png',
  '/images/symbols/opal-star.png',
  '/images/symbols/kawaii-planet.png',
];

// Change either value to Math.PI if a model faces backward after export.
const CAT_MODEL_ROTATION_Y = 0;
const BOAT_MODEL_ROTATION_Y = 0;

const START = new THREE.Vector3(1.62, -0.50, 5.0);
const DEFAULT_SEAT = new THREE.Vector3(2.5, 1.0, 2.1);
const DRAG_Z = 5.0;
const BOAT_DEPTH = -8.2;
const BOAT_WATERLINE_Y = -0.28;
const CAT_GROUND_Y = -0.5;

// Foreground water position: left of the alien cat and partly under the water.
// x = left/right, y = water height/submerge, z = front/back.
// More negative x moves it left. More negative y sinks it deeper into the water.
const FLOAT_RING_POSITION = new THREE.Vector3(-1.30, BOAT_WATERLINE_Y - 0.92, 4.88);
const FLOAT_RING_TARGET_SIZE = 1.68;
const FLOAT_RING_MODEL_TILT_X = -Math.PI / 2;

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const LAUNCH_DURATION_SECONDS = 3;
const LAUNCH_DISTANCE = 120;
const LAUNCH_HEIGHT = 6;

const RING_TERMINAL_MESSAGE = `• Modeling: £50 an hour.

• Make-up: £50

• Styling: £50

• Video editing: £15 per video.

• Art Director: £150`;

const RING_CHAT_BUBBLES = [
  { x: 8, y: 10, size: 74, delay: 0.0, speed: 7.2 },
  { x: 19, y: 76, size: 52, delay: -1.4, speed: 6.3 },
  { x: 31, y: 18, size: 42, delay: -2.7, speed: 5.8 },
  { x: 42, y: 84, size: 86, delay: -0.8, speed: 7.9 },
  { x: 56, y: 9, size: 58, delay: -3.1, speed: 6.5 },
  { x: 69, y: 68, size: 44, delay: -1.9, speed: 5.9 },
  { x: 82, y: 20, size: 96, delay: -2.2, speed: 8.2 },
  { x: 91, y: 82, size: 62, delay: -0.6, speed: 6.7 },
  { x: 14, y: 49, size: 38, delay: -3.6, speed: 5.5 },
  { x: 74, y: 43, size: 70, delay: -4.0, speed: 7.1 },
  { x: 50, y: 54, size: 50, delay: -2.8, speed: 6.0 },
  { x: 6, y: 88, size: 110, delay: -1.1, speed: 8.5 },
];

const MISSION_LINK_IMAGES = [
    {
        title: 'DREAMY',
        titleKey: 'dreamy',
            image: '/images/covers/dreamy.jpg',
                url: 'https://www.almostmadeinjapan.com/collections/dreamy',
                  },
                    {
                        title: 'EMO',
                            titleKey: 'emo',
                            image: '/images/covers/emo.jpg',
                                url: 'https://www.almostmadeinjapan.com/collections/emo',
                                  },
                                   {
                                       title: 'NATURE',
                                           titleKey: 'nature',
                                           image: '/images/covers/nature.jpg',
                                               url: 'https://www.almostmadeinjapan.com/collections/frontpage',
                                                 },
                                                  {
                                                      title: 'CYBER',
                                                      titleKey: 'cyber',
                                                          image: '/images/covers/cyber.jpg',
                                                              url: 'https://www.almostmadeinjapan.com/collections/cyber',
                                                                },
                                                                ];

const MOVING_BG_SYMBOLS = [
  '/images/symbols/pink-star-brooch.png',
  '/images/symbols/pearl-planet.png',
  '/images/symbols/fluffy-purple-star.png',
  '/images/symbols/opal-star.png',
  '/images/symbols/kawaii-planet.png',
];

// Maximum total symbols across all 5 images.
const TOTAL_MOVING_SYMBOLS = 30;

function createMovingBackgroundSymbols() {
  const columns = 6;
  const rows = 6;

  const slots = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slots.push({ row, column });
    }
  }

  // Shuffle the grid cells so the five symbol types feel random,
  // while still keeping enough spacing between every emblem.
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[swapIndex]] = [slots[swapIndex], slots[i]];
  }

  return slots.slice(0, TOTAL_MOVING_SYMBOLS).map((slot, index) => {
    const cellWidth = 100 / columns;

    // Keep the whole symbol field mostly in the upper part of the art.
    const yRows = [6, 15, 25, 37, 51, 66];

    return {
      id: `symbol-${index}`,
      src: MOVING_BG_SYMBOLS[index % MOVING_BG_SYMBOLS.length],
      x: slot.column * cellWidth + cellWidth * 0.5 + (Math.random() * 6 - 3),
      y: yRows[slot.row] + (Math.random() * 4 - 2),
      size: 36 + Math.random() * 28,
      opacity: 0.52 + Math.random() * 0.28,
    };
  });
}

function createFluffSpriteTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const center = size * 0.5;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

  gradient.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.66)');
  gradient.addColorStop(0.56, 'rgba(255,255,255,0.24)');
  gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Tiny radial strokes make each point read as fur instead of dust.
  for (let i = 0; i < 220; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const start = 6 + Math.random() * 14;
    const end = 28 + Math.random() * 34;

    ctx.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.24})`;
    ctx.lineWidth = 0.32 + Math.random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * start, center + Math.sin(angle) * start);
    ctx.lineTo(center + Math.cos(angle) * end, center + Math.sin(angle) * end);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

function shouldSkipFluff(object, skipPattern) {
  const meshName = object.name || '';
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  const materialNames = materials
    .map((material) => material?.name || '')
    .join(' ');

  return skipPattern.test(`${meshName} ${materialNames}`);
}

function collectFluffSurfaceSamples(root, skipPattern) {
  const samples = [];
  const rootInverse = new THREE.Matrix4();
  const localPosition = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const normalTip = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  root.updateMatrixWorld(true);
  rootInverse.copy(root.matrixWorld).invert();

  root.traverse((object) => {
    if (!object.isMesh || !object.geometry?.attributes?.position) return;
    if (object.userData?.softFluffCloud) return;
    if (shouldSkipFluff(object, skipPattern)) return;

    if (!object.geometry.attributes.normal) {
      object.geometry.computeVertexNormals();
    }

    const positionAttr = object.geometry.attributes.position;
    const normalAttr = object.geometry.attributes.normal;
    const step = Math.max(1, Math.floor(positionAttr.count / 520));

    normalMatrix.getNormalMatrix(object.matrixWorld);

    for (let i = 0; i < positionAttr.count; i += step) {
      localPosition.fromBufferAttribute(positionAttr, i);
      worldPosition.copy(localPosition).applyMatrix4(object.matrixWorld);

      if (normalAttr) {
        worldNormal.fromBufferAttribute(normalAttr, i).applyMatrix3(normalMatrix).normalize();
      } else {
        worldNormal.set(0, 1, 0);
      }

      const rootPosition = worldPosition.clone().applyMatrix4(rootInverse);
      normalTip.copy(worldPosition).add(worldNormal).applyMatrix4(rootInverse);

      const rootNormal = normalTip.sub(rootPosition).normalize();

      samples.push({
        position: rootPosition.clone(),
        normal: rootNormal.lengthSq() > 0.001
          ? rootNormal.clone()
          : new THREE.Vector3(0, 1, 0),
      });
    }
  });

  return samples;
}

function addTexturePreservingFluff(root, options = {}) {
  const {
    texture,
    count = 420,
    size = 0.085,
    opacity = 0.36,
    shellOffset = 0.085,
    jitter = 0.032,
    palette = ['#ffffff'],
    skipPattern = /eye|eyes|pupil|iris|glass|window|light|glow|black|mouth|teeth|screen|gem|crystal|metal|chrome/i,
  } = options;

  if (!texture) return null;

  const samples = collectFluffSurfaceSamples(root, skipPattern);
  if (!samples.length) return null;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorPalette = palette.map((color) => new THREE.Color(color));
  const randomDirection = new THREE.Vector3();

  for (let i = 0; i < count; i += 1) {
    const sample = samples[Math.floor(Math.random() * samples.length)];
    const distance = shellOffset * (0.9 + Math.random() * 1.45);

    randomDirection
      .set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      )
      .normalize()
      .multiplyScalar(jitter * Math.random());

    const point = sample.position
      .clone()
      .addScaledVector(sample.normal, distance)
      .add(randomDirection);

    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;

    const color = colorPalette[i % colorPalette.length]
      .clone()
      .lerp(new THREE.Color('#ffffff'), Math.random() * 0.42);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    map: texture,
    size,
    vertexColors: true,
    transparent: true,
    opacity,
    alphaTest: 0.025,
    depthWrite: false,
    depthTest: true,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  });

  const cloud = new THREE.Points(geometry, material);
  cloud.name = `${root.name || 'model'}_texture_preserving_fluff`;
  cloud.frustumCulled = false;
  cloud.renderOrder = 55;
  cloud.userData.softFluffCloud = true;
  cloud.userData.fluffMotion = {
    baseSize: size,
    baseOpacity: opacity,
    phase: Math.random() * Math.PI * 2,
  };

  root.add(cloud);
  return cloud;
}


function improveModelQuality(root, renderer, pastelPalette) {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const processedMaterials = new Set();
  let meshIndex = 0;

  root.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = true;

    if (object.geometry && !object.geometry.attributes.normal) {
      object.geometry.computeVertexNormals();
    }

    const tint = pastelPalette?.[
      meshIndex % pastelPalette.length
    ];

    meshIndex += 1;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      if (!material || processedMaterials.has(material)) return;
      processedMaterials.add(material);

      // Smooth shading avoids faceted, low-poly-looking surfaces.
      material.flatShading = false;

      // Preserve textures while gently shifting the whole scene toward
      // pastel pink, purple and blue.
      if (tint && material.color) {
        material.color.lerp(
          tint,
          material.map ? 0.18 : 0.42,
        );
      }

      [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.emissiveMap,
        material.aoMap,
      ].forEach((texture) => {
        if (!texture) return;
        texture.anisotropy = anisotropy;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
      });

      material.needsUpdate = true;
    });
  });
}

function fitModel(root, targetSize, groundY, rotationY, scaleMode = 'max') {
  root.rotation.set(0, rotationY, 0);
  root.updateMatrixWorld(true);

  let box = new THREE.Box3().setFromObject(root);
  const initialSize = box.getSize(new THREE.Vector3());

  const measuredSize =
    scaleMode === 'horizontal'
      ? Math.max(initialSize.x, initialSize.z)
      : Math.max(initialSize.x, initialSize.y, initialSize.z);

  if (!Number.isFinite(measuredSize) || measuredSize <= 0) {
    throw new Error('The GLB model has no measurable geometry.');
  }

  root.scale.multiplyScalar(targetSize / measuredSize);
  root.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y += groundY - box.min.y;
  root.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(root);
}

function createMixer(root, clips, mixers) {
  if (!clips?.length) return;

  const mixer = new THREE.AnimationMixer(root);
  clips.forEach((clip) => mixer.clipAction(clip).play());
  mixers.push(mixer);
}

function createPreloadStore() {
  return {
    gltfLoader: null,
    textureLoader: null,
    models: new Map(),
    modelPromises: new Map(),
    modelErrors: new Map(),
    images: new Map(),
    imagePromises: new Map(),
    imageErrors: new Map(),
  };
}

function getPreloadGLTFLoader(store) {
  if (!store.gltfLoader) {
    store.gltfLoader = new GLTFLoader();
  }

  return store.gltfLoader;
}

function getPreloadTextureLoader(store) {
  if (!store.textureLoader) {
    store.textureLoader = new THREE.TextureLoader();
  }

  return store.textureLoader;
}

function preloadGLB(store, url) {
  if (!store || !url) return Promise.reject(new Error('Missing preload store or GLB url.'));
  if (store.models.has(url)) return Promise.resolve(store.models.get(url));
  if (store.modelPromises.has(url)) return store.modelPromises.get(url);

  const promise = getPreloadGLTFLoader(store)
    .loadAsync(url)
    .then((gltf) => {
      store.models.set(url, gltf);
      store.modelErrors.delete(url);
      return gltf;
    })
    .catch((error) => {
      store.modelErrors.set(url, error);
      throw error;
    });

  store.modelPromises.set(url, promise);
  return promise;
}

function preloadTexture(store, url) {
  if (!store || !url) return Promise.resolve(null);
  if (store.images.has(url)) return Promise.resolve(store.images.get(url));
  if (store.imagePromises.has(url)) return store.imagePromises.get(url);

  const promise = getPreloadTextureLoader(store)
    .loadAsync(url)
    .then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      store.images.set(url, texture);
      store.imageErrors.delete(url);
      return texture;
    })
    .catch((error) => {
      store.imageErrors.set(url, error);
      return null;
    });

  store.imagePromises.set(url, promise);
  return promise;
}

function cloneMaterialsForScene(root) {
  const clonedMaterials = new Map();

  root.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => {
        if (!material) return material;
        if (!clonedMaterials.has(material)) {
          clonedMaterials.set(material, material.clone());
        }
        return clonedMaterials.get(material);
      });
    } else {
      const material = object.material;
      if (!clonedMaterials.has(material)) {
        clonedMaterials.set(material, material.clone());
      }
      object.material = clonedMaterials.get(material);
    }
  });
}

function clonePreloadedGLTF(gltf) {
  if (!gltf?.scene) return null;

  const scene = cloneSkeleton(gltf.scene);
  cloneMaterialsForScene(scene);

  return {
    scene,
    animations: gltf.animations || [],
  };
}

async function loadSceneGLTF(store, url) {
  const cached = store?.models?.get(url);

  if (cached) {
    return clonePreloadedGLTF(cached);
  }

  const gltf = await preloadGLB(store, url);
  return clonePreloadedGLTF(gltf);
}

function runSoonWhenIdle(callback, timeout = 350) {
  if (typeof window === 'undefined') return null;

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(callback, { timeout: 1800 });
    return () => window.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(id);
}

function createUltraFastWater() {
  // Smooth, high pastel waves for mobile:
  // one water mesh, no flat overlay planes, no GLB, no texture slicing.
  // Colors live directly on the wave vertices so pink/lavender/cyan stay visible.
  const segments = window.innerWidth < 768 ? 44 : 64;
  const geometry = new THREE.PlaneGeometry(
    120,
    120,
    segments,
    segments,
  );

  const waterPositions = geometry.attributes.position;
  const basePositions = waterPositions.array.slice();

  const waterColors = new Float32Array(waterPositions.count * 3);
  const cyan = new THREE.Color('#4ffaff');
  const deepCyan = new THREE.Color('#00d8ff');
  const pink = new THREE.Color('#ff5eea');
  const softPink = new THREE.Color('#ffd6f5');
  const lavender = new THREE.Color('#a98cff');
  const whiteFoam = new THREE.Color('#ffffff');
  const mixedColor = new THREE.Color();

  for (let i = 0; i < waterPositions.count; i += 1) {
    const x = basePositions[i * 3];
    const y = basePositions[i * 3 + 1];

    const ribbonA = (Math.sin(x * 0.11 + y * 0.035) + 1) * 0.5;
    const ribbonB = (Math.cos(y * 0.10 - x * 0.025) + 1) * 0.5;
    const ribbonC = (Math.sin((x + y) * 0.055) + 1) * 0.5;

    mixedColor.copy(cyan).lerp(pink, ribbonA * 0.55);
    mixedColor.lerp(lavender, ribbonB * 0.45);
    mixedColor.lerp(softPink, ribbonC * 0.18);

    waterColors[i * 3] = mixedColor.r;
    waterColors[i * 3 + 1] = mixedColor.g;
    waterColors[i * 3 + 2] = mixedColor.b;
  }

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(waterColors, 3),
  );
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,

    // No texture by default.
    // If /images/water-texture.jpg is missing, the water stays exactly like before.
    map: null,

    vertexColors: true,
    roughness: 0.18,
    metalness: 0,
    transparent: false,
    flatShading: false,
    side: THREE.DoubleSide,
  });

  const water = new THREE.Mesh(geometry, material);
  water.name = 'SmoothColorfulHighPastelWater';
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.03, -2.2);
  water.receiveShadow = false;
  water.castShadow = false;
  water.frustumCulled = true;

  const group = new THREE.Group();
  group.name = 'SmoothColorfulHighPastelWaterGroup';
  group.add(water);

  return {
    group,
    water,
    waterPositions,
    basePositions,
    waterColors,
    cyan,
    deepCyan,
    pink,
    softPink,
    lavender,
    whiteFoam,
  };
}

function createPinkWireframeGlobe() {
  const globe = new THREE.Group();
  globe.name = 'PinkWireframeGlobeBehindTriangleWater';

  const radius = 1.35;
  const tube = 0.009;

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0xff9edb,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });

  const bodyMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc7ea,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.995, 18, 10),
    bodyMaterial,
  );

  body.renderOrder = -100001;
  globe.add(body);

  const latitudeCount = 9;

  for (let i = 1; i < latitudeCount; i += 1) {
    const t = i / latitudeCount;
    const y = Math.cos(t * Math.PI) * radius;
    const ringRadius = Math.sin(t * Math.PI) * radius;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ringRadius, tube, 6, 72),
      lineMaterial,
    );

    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.renderOrder = -100001;
    globe.add(ring);
  }

  const longitudeCount = 16;

  for (let i = 0; i < longitudeCount; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 6, 84),
      lineMaterial,
    );

    ring.rotation.y = (i / longitudeCount) * Math.PI;
    ring.renderOrder = -100001;
    globe.add(ring);
  }

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.01, tube * 1.75, 6, 96),
    lineMaterial,
  );

  outerRing.rotation.x = Math.PI / 2;
  outerRing.renderOrder = -100001;
  globe.add(outerRing);

  globe.position.set(0, 29.0, -620);
  globe.scale.setScalar(22);
  globe.rotation.x = -0.18;
  globe.rotation.z = 0.08;
  globe.renderOrder = -100001;
  globe.frustumCulled = false;

  globe.traverse((child) => {
    child.renderOrder = -100001;
    child.frustumCulled = false;
  });

  return globe;
}


function createInfinityTriangleWater() {
  // Star-Wars-style flat infinity triangle.
  // This is a real 3D floor triangle, not a screen billboard.
  // It renders first like z-index: -100000, so the old opaque water,
  // boat and alien cat always render on top of it.
  const geometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    // Wide near edge, hidden underneath the old opaque waves.
    -35.0, 0.0, 0.0,
     35.0, 0.0, 0.0,

    // Slightly longer infinity tip with soft fade-out.
      0.0, 30.0, -600.0,
  ]);

  const uvs = new Float32Array([
    0.0, 0.0,
    1.0, 0.0,
    0.5, 1.0,
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },

      // Optional texture. Starts inactive so missing texture keeps the original look.
      uWaterTexture: { value: null },
      uTextureStrength: { value: 0.0 },

      colorA: { value: new THREE.Color('#c8f7ff') },
      colorB: { value: new THREE.Color('#f7ddff') },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uWaterTexture;
      uniform float uTextureStrength;
      uniform vec3 colorA;
      uniform vec3 colorB;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;

        // Soft edge mask for the triangle sides.
        float leftEdge = smoothstep(0.0, 0.055, uv.x);
        float rightEdge = smoothstep(1.0, 0.945, uv.x);
        float baseFade = smoothstep(0.0, 0.1, uv.y);
        float shape = leftEdge * rightEdge * baseFade;

        if (shape < 0.01) discard;

        // Horizontal-only water reflections, stretched like a flat distant runway.
        float driftA = sin(uv.x * 24.0 + uTime * 0.55 + uv.y * 3.0);
        float driftB = sin(uv.x * 48.0 - uTime * 0.75 + uv.y * 7.0);
        float driftC = sin(uv.x * 10.0 + uTime * 0.28);
        float water = driftA * 0.30 + driftB * 0.14 + driftC * 0.10;
        water = water * 0.5 + 0.5;

        vec3 lavender = vec3(0.84, 0.80, 1.0);
        vec3 pink = vec3(1.0, 0.84, 0.98);
        vec3 white = vec3(1.0, 0.985, 1.0);

        vec3 color = mix(colorA, lavender, uv.y * 0.60);
        color = mix(color, colorB, water * 0.18);
        color = mix(color, pink, water * 0.10);

        // Bright center reflection to sell the infinity point.
        float center = 1.0 - abs(uv.x - 0.5) * 2.0;
        center = pow(max(center, 0.0), 2.0);
        color = mix(color, white, center * 0.24);

        float gloss = smoothstep(0.74, 1.0, water) * (1.0 - uv.y * 0.38);
        color = mix(color, white, gloss * 0.18);

        // Optional water texture.
        // It only changes the triangle after /images/water-texture.jpg loads.
        if (uTextureStrength > 0.001) {
          vec2 textureUv = vec2(
            uv.x * 4.0 + uTime * 0.025,
            uv.y * 10.0 - uTime * 0.045
          );

          vec3 tex = texture2D(uWaterTexture, textureUv).rgb;
          color = mix(color, tex, uTextureStrength);
        }

        // Ultra soft Star-Wars horizon fade at the top tip.
        float horizonFade = pow(
  1.0 - smoothstep(
    0.35,
    1.0,
    uv.y
  ),
  3.0
);

        float alpha = shape * horizonFade * 0.92;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const triangle = new THREE.Mesh(geometry, material);
    
  triangle.name = 'FlatStarWarsInfinityTriangleWaterZIndexMinus100000';

  // Same floor level as the water, but far behind the boat.
  // The old opaque waves cover the near edge, so it only appears after them.
  triangle.position.set(0, -1.34, -10.0);
  triangle.renderOrder = -100000;
  triangle.frustumCulled = false;

  return triangle;
}

function disposeObject(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();

    const materials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : [];

    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}

function loadBlurredSpriteTexture(url, blurPx = 3.0) {
  return new Promise((resolve, reject) => {
    const imageLoader = new THREE.ImageLoader();

    imageLoader.load(
      url,
      (image) => {
        const padding = Math.ceil(blurPx * 6);

        const canvas = document.createElement('canvas');
        canvas.width = image.width + padding * 2;
        canvas.height = image.height + padding * 2;

        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // IMPORTANT:
        // Only draw the blurred image.
        // Do NOT draw the sharp image again on top.
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(image, padding, padding);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;

        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}



function ShoppingIntroSplash({ onFinished, preloadStore, coreModelsReady, selectedLanguageCode, onLanguageChange }) {
  const bubbleCanvasRef = useRef(null);
const catCanvasRef = useRef(null);
const textCardRef = useRef(null);
const enterButtonRef = useRef(null);

  const coreModelsReadyRef = useRef(coreModelsReady);
const requestIntroExitRef = useRef(null);
const translateGlbStageRef = useRef(null);
const [isFading, setIsFading] = useState(false);
const [introExitRequested, setIntroExitRequested] = useState(false);
const [showTranslateModal, setShowTranslateModal] = useState(false);
const [translateGlbStatusKey, setTranslateGlbStatusKey] = useState('chooseLanguage');

const selectedTranslateLanguageCode = selectedLanguageCode || DEFAULT_LANGUAGE_CODE;
const languageCopy = getSiteCopy(selectedTranslateLanguageCode);
const selectedTranslateLanguage =
  TRANSLATE_LANGUAGE_OPTIONS.find((language) => language.code === selectedTranslateLanguageCode) ||
  TRANSLATE_LANGUAGE_OPTIONS[0];
const selectedTranslateLanguageName =
  selectedTranslateLanguage.nativeName || selectedTranslateLanguage.name;

  useEffect(() => {
    coreModelsReadyRef.current = coreModelsReady;
  }, [coreModelsReady]);

  useEffect(() => {
    const bubbleCanvas = bubbleCanvasRef.current;
    const catCanvas = catCanvasRef.current;

    if (!bubbleCanvas || !catCanvas) return undefined;

    let disposed = false;
    let animationFrame = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let introExitRequestedAt = null;
    let viewportWidth = 10;
    const viewportHeight = 10;

    const isMobileIntro = width < 700 || window.matchMedia?.('(pointer: coarse)').matches;
   const INTRO_BUBBLE_COUNT = isMobileIntro ? 64 : 92;
const INTRO_VISIBLE_SECONDS = 3.6;
const INTRO_FADE_SECONDS = 0.78;

const CAT_GROUND_IN_INTRO = -0.44;
const INTRO_CAT_DRAG_HIT_RADIUS = 1.65;
const INTRO_CAT_RETURN_SPEED = 5.8;
const INTRO_CAT_DRAG_SPEED = 18;

const requestIntroExit = () => {
  if (introExitRequestedAt !== null || disposed) return;
  introExitRequestedAt = elapsed;
  setIntroExitRequested(true);
};

requestIntroExitRef.current = requestIntroExit;

const handleIntroKeyDown = (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  requestIntroExit();
};

window.addEventListener('keydown', handleIntroKeyDown);

    const bubbleContext = bubbleCanvas.getContext('2d');

    if (!bubbleContext) return undefined;

    const rand = (min, max) => min + Math.random() * (max - min);
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const smoothstep = (edge0, edge1, value) => {
      const t = clamp01((value - edge0) / (edge1 - edge0));
      return t * t * (3 - 2 * t);
    };
    const easeOutQuart = (value) => 1 - Math.pow(1 - value, 4);
    const lerp = (from, to, amount) => from + (to - from) * amount;

    const makeBubbleTexture = () => {
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.4;

      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.62)';
      ctx.shadowBlur = 28;
      const glow = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.18);
      glow.addColorStop(0.0, 'rgba(255,255,255,0.00)');
      glow.addColorStop(0.60, 'rgba(255,255,255,0.16)');
      glow.addColorStop(0.82, 'rgba(255,255,255,0.34)');
      glow.addColorStop(1.0, 'rgba(255,255,255,0.00)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.restore();

      const body = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
      body.addColorStop(0.0, 'rgba(255,255,255,0.065)');
      body.addColorStop(0.45, 'rgba(255,255,255,0.075)');
      body.addColorStop(0.82, 'rgba(255,255,255,0.050)');
      body.addColorStop(1.0, 'rgba(255,255,255,0.00)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.25)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 11;
      ctx.strokeStyle = 'rgba(255,255,255,0.62)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.20)';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 18;
      ctx.strokeStyle = 'rgba(255,255,255,0.94)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.79, Math.PI * 0.66, Math.PI * 1.44);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.34)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.40)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.77, -Math.PI * 0.18, Math.PI * 0.12);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.18)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.28, cy - r * 0.26, r * 0.11, r * 0.07, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return canvas;
    };

    const bubbleTexture = makeBubbleTexture();
    const bubbles = Array.from({ length: INTRO_BUBBLE_COUNT }, () => ({}));

    const setupBubble = (bubble) => {
      const unit = height / viewportHeight;
      const roll = Math.random();
      const sizeUnit = roll < 0.15
        ? rand(1.0, 1.55)
        : roll < 0.55
          ? rand(0.55, 1.05)
          : rand(0.20, 0.60);
      const verticalBias = Math.pow(Math.random(), 2.4);

      bubble.sizeUnit = sizeUnit;
      bubble.x = rand(-width * 0.05, width * 1.05);
      bubble.y = height - verticalBias * (height * 1.02);
      bubble.vx = rand(-0.18, 0.18) * unit;
      bubble.vy = -rand(0.75, 1.95) * unit;
      bubble.wobbleAmp = rand(0.03, 0.11) * unit;
      bubble.wobbleSpeed = rand(1.8, 4.4);
      bubble.wobblePhase = rand(0, Math.PI * 2);
      bubble.baseOpacity = rand(0.72, 0.86);
    };

    const resizeBubbleCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dprLimit = width < 700 ? 1.25 : 1.6;
      const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);

      bubbleCanvas.width = Math.round(width * dpr);
      bubbleCanvas.height = Math.round(height * dpr);
      bubbleCanvas.style.width = `${width}px`;
      bubbleCanvas.style.height = `${height}px`;
      bubbleContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      bubbles.forEach(setupBubble);
    };

    const renderer = new THREE.WebGLRenderer({
      canvas: catCanvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const introScene = new THREE.Scene();
    const introCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    introCamera.position.z = 10;

    introScene.add(new THREE.HemisphereLight(0xe9e4ff, 0xffe8f5, 2.65));

    const introKeyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    introKeyLight.position.set(4, 8, 7);
    introScene.add(introKeyLight);

    const introPinkLight = new THREE.PointLight(0xffb7dc, 2.4, 24);
    introPinkLight.position.set(4, 2.5, 4);
    introScene.add(introPinkLight);

    const introBlueLight = new THREE.PointLight(0xaedbff, 2.4, 24);
    introBlueLight.position.set(-4, 2.2, 4);
    introScene.add(introBlueLight);

    
const introCatGroup = new THREE.Group();
introCatGroup.visible = false;
introScene.add(introCatGroup);

const introRaycaster = new THREE.Raycaster();
const introPointerNDC = new THREE.Vector2();
const introPointerWorld = new THREE.Vector3();
const introDragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const introHomePosition = new THREE.Vector3();
const introDragTarget = new THREE.Vector3();
const introDragOffset = new THREE.Vector3();

const introDragState = {
  isDragging: false,
  hasMoved: false,
  pointerId: null,
  startClientX: 0,
  startClientY: 0,
};

let introCatLoadedAt = 0;
const introMixers = [];
    

    loadSceneGLTF(preloadStore, CAT_MODEL_URL)
      .then((gltf) => {
        if (!gltf?.scene) return;

        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        const catModel = gltf.scene;
        catModel.name = 'ShoppingIntroAlienCat';
        improveModelQuality(catModel, renderer, [
          new THREE.Color(0xffb7dc),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xaedbff),
        ]);
        fitModel(catModel, 3.55, CAT_GROUND_IN_INTRO, CAT_MODEL_ROTATION_Y, 'max');
        introCatGroup.add(catModel);
        createMixer(catModel, gltf.animations, introMixers);
        introCatLoadedAt = elapsed;
        introCatGroup.visible = true;
      })
      .catch((error) => {
        console.error('Could not load intro alien-cat.glb:', error);
      });

    const resizeCatCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const aspect = width / height;
      viewportWidth = viewportHeight * aspect;

      introCamera.left = -viewportWidth / 2;
      introCamera.right = viewportWidth / 2;
      introCamera.top = viewportHeight / 2;
      introCamera.bottom = -viewportHeight / 2;
      introCamera.updateProjectionMatrix();

      const dprLimit = width < 700 ? 1.25 : 1.5;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprLimit));
      renderer.setSize(width, height, false);
    };

const getIntroCatTargetY = () => {
  const enterButton = enterButtonRef.current;
  const buttonTopPx = enterButton
    ? enterButton.getBoundingClientRect().top
    : height * 0.82;

  const buttonTopWorld =
    introCamera.top - (buttonTopPx / height) * viewportHeight;

  // Feet land on the top edge of the ENTER button.
  // Change -0.02 to -0.08 if you want the cat to sink into the button more.
  return buttonTopWorld - CAT_GROUND_IN_INTRO - 0.02;
};

const introPointerToWorld = (clientX, clientY) => {
  const rect = catCanvas.getBoundingClientRect();

  introPointerNDC.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );

  introRaycaster.setFromCamera(introPointerNDC, introCamera);
  introRaycaster.ray.intersectPlane(introDragPlane, introPointerWorld);

  return introPointerWorld;
};

const clampIntroCatPosition = (position) => {
  const marginX = Math.min(2.1, viewportWidth * 0.28);
  const minX = introCamera.left + marginX;
  const maxX = introCamera.right - marginX;
  const minY = introCamera.bottom + 1.25;
  const maxY = introCamera.top - 1.25;

  position.x = clampNumber(position.x, minX, maxX);
  position.y = clampNumber(position.y, minY, maxY);
  position.z = 0;

  return position;
};

const isPointerOverIntroCat = (clientX, clientY) => {
  if (!introCatGroup.visible) return false;

  introPointerToWorld(clientX, clientY);
  const intersections = introRaycaster.intersectObject(introCatGroup, true);

  if (intersections.length > 0) return true;

  return introPointerWorld.distanceTo(introCatGroup.position) < INTRO_CAT_DRAG_HIT_RADIUS;
};

const onIntroCatPointerDown = (event) => {
  if (introExitRequestedAt !== null || !introCatGroup.visible) return;
  if (!isPointerOverIntroCat(event.clientX, event.clientY)) return;

  event.preventDefault();

  introDragState.isDragging = true;
  introDragState.hasMoved = false;
  introDragState.pointerId = event.pointerId;
  introDragState.startClientX = event.clientX;
  introDragState.startClientY = event.clientY;

  introDragOffset.copy(introCatGroup.position).sub(introPointerWorld);
  introDragTarget.copy(introCatGroup.position);

  document.body.style.cursor = 'grabbing';


};

const onIntroCatPointerMove = (event) => {
  if (!introDragState.isDragging) return;

  event.preventDefault();

  const movedDistance = Math.hypot(
    event.clientX - introDragState.startClientX,
    event.clientY - introDragState.startClientY,
  );

  if (movedDistance > 4) {
    introDragState.hasMoved = true;
  }

  const world = introPointerToWorld(event.clientX, event.clientY);
  introDragTarget.copy(world).add(introDragOffset);
  clampIntroCatPosition(introDragTarget);
};

const finishIntroCatDrag = (event) => {
  if (!introDragState.isDragging) return;

  introDragState.isDragging = false;
  introDragState.pointerId = null;
  document.body.style.cursor = '';


};    

const drawBubbles = (dt) => {
  if (!bubbleContext) return;

  const exitElapsed =
    introExitRequestedAt === null ? 0 : elapsed - introExitRequestedAt;

  const vanish =
    introExitRequestedAt === null
      ? 0
      : smoothstep(0, INTRO_FADE_SECONDS, exitElapsed);

  const growElapsed = Math.min(elapsed, INTRO_VISIBLE_SECONDS);

  bubbleContext.clearRect(0, 0, width, height);

  bubbles.forEach((bubble) => {
    const wobble =
      Math.sin(elapsed * bubble.wobbleSpeed + bubble.wobblePhase) *
      bubble.wobbleAmp;

    bubble.x += (bubble.vx + wobble * 0.9) * dt;
    bubble.y += bubble.vy * dt;

    const grow =
      1.0 +
      (growElapsed / INTRO_VISIBLE_SECONDS) * 0.10 +
      vanish * 0.12;

    const sizePx = bubble.sizeUnit * (height / viewportHeight) * grow;
    const recyclePadding = sizePx * 1.35;

    if (
      introExitRequestedAt === null &&
      (
        bubble.y < -recyclePadding ||
        bubble.x < -recyclePadding ||
        bubble.x > width + recyclePadding
      )
    ) {
      setupBubble(bubble);
      bubble.y = height + recyclePadding * rand(0.2, 1.1);
      return;
    }

    bubbleContext.globalAlpha = bubble.baseOpacity * (1.0 - vanish);
    bubbleContext.drawImage(
      bubbleTexture,
      bubble.x - sizePx / 2,
      bubble.y - sizePx / 2,
      sizePx,
      sizePx,
    );
  });

  bubbleContext.globalAlpha = 1;
};

    let fadeStartedAt = 0;

    const animate = (now) => {
      if (disposed) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      drawBubbles(dt);

      const catFallElapsed = introCatGroup.visible
        ? Math.max(0, elapsed - introCatLoadedAt)
        : 0;
      const fallProgress = clamp01((catFallElapsed - 0.05) / 0.62);
      const easedFall = easeOutQuart(fallProgress);
      const startY = introCamera.top + 3.35;
      const targetY = getIntroCatTargetY();
      const bounce = fallProgress >= 1
        ? Math.sin((catFallElapsed - 0.67) * 20) * Math.exp(-(catFallElapsed - 0.67) * 5) * 0.10
        : 0;

const walkCycle = (elapsed * 0.085) % 1;
const edgeDistance = Math.min(
  Math.max(1.85, viewportWidth * 0.42),
  viewportWidth * 0.5 - 0.95,
);

let introWalkX = 0;

if (walkCycle < 0.24) {
  // Long pause in the middle
  introWalkX = 0;
} else if (walkCycle < 0.38) {
  // Middle to right edge
  const t = smoothstep(0, 1, (walkCycle - 0.24) / 0.14);
  introWalkX = lerp(0, edgeDistance, t);
} else if (walkCycle < 0.46) {
  // Short pause near right edge
  introWalkX = edgeDistance;
} else if (walkCycle < 0.60) {
  // Right edge back to middle
  const t = smoothstep(0, 1, (walkCycle - 0.46) / 0.14);
  introWalkX = lerp(edgeDistance, 0, t);
} else if (walkCycle < 0.78) {
  // Long pause in the middle again
  introWalkX = 0;
} else if (walkCycle < 0.92) {
  // Middle to left edge
  const t = smoothstep(0, 1, (walkCycle - 0.78) / 0.14);
  introWalkX = lerp(0, -edgeDistance, t);
} else {
  // Left edge back to middle
  const t = smoothstep(0, 1, (walkCycle - 0.92) / 0.08);
  introWalkX = lerp(-edgeDistance, 0, t);
}

introHomePosition.set(
  introWalkX,
  lerp(startY, targetY, easedFall) + bounce + Math.sin(elapsed * 1.65) * 0.045,
  0,
);

if (introDragState.isDragging) {
  introCatGroup.position.lerp(
    introDragTarget,
    Math.min(1, dt * INTRO_CAT_DRAG_SPEED),
  );
} else if (fallProgress < 1) {
  introCatGroup.position.copy(introHomePosition);
} else {
  introCatGroup.position.lerp(
    introHomePosition,
    Math.min(1, dt * INTRO_CAT_RETURN_SPEED),
  );
}

introCatGroup.rotation.x = introDragState.isDragging
  ? Math.sin(elapsed * 8.0) * 0.07
  : Math.sin(elapsed * 6.5) * 0.045;

introCatGroup.rotation.y = introDragState.isDragging
  ? clampNumber(introCatGroup.position.x * -0.16, -0.42, 0.42)
  : Math.sin(elapsed * 4.7) * 0.16;

introCatGroup.rotation.z = introDragState.isDragging
  ? clampNumber(introCatGroup.position.x * -0.045, -0.18, 0.18)
  : (1 - easedFall) * -0.28 + Math.sin(elapsed * 9) * 0.035;

introCatGroup.scale.setScalar(1 + Math.max(0, bounce) * 0.18);

      introMixers.forEach((mixer) => mixer.update(dt));
      renderer.render(introScene, introCamera);

const exitElapsed =
  introExitRequestedAt === null ? 0 : elapsed - introExitRequestedAt;

const preloadWaitTimedOut =
  introExitRequestedAt !== null && exitElapsed >= 1.35;

const canFadeToMain =
  introExitRequestedAt !== null &&
  (coreModelsReadyRef.current || preloadWaitTimedOut);

      if (canFadeToMain && !fadeStartedAt) {
        fadeStartedAt = elapsed;
        setIsFading(true);
      }

      if (fadeStartedAt && elapsed >= fadeStartedAt + INTRO_FADE_SECONDS && !disposed) {
        onFinished?.();
        return;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      resizeBubbleCanvas();
      resizeCatCanvas();
    };

handleResize();
animationFrame = requestAnimationFrame(animate);
window.addEventListener('resize', handleResize);

catCanvas.style.touchAction = 'none';
catCanvas.style.pointerEvents = 'none';

window.addEventListener('pointerdown', onIntroCatPointerDown);
window.addEventListener('pointermove', onIntroCatPointerMove);
window.addEventListener('pointerup', finishIntroCatDrag);
window.addEventListener('pointercancel', finishIntroCatDrag);
    
    return () => {
  disposed = true;
  cancelAnimationFrame(animationFrame);

  window.removeEventListener('resize', handleResize);
  window.removeEventListener('pointerdown', onIntroCatPointerDown);
window.removeEventListener('pointermove', onIntroCatPointerMove);
window.removeEventListener('pointerup', finishIntroCatDrag);
window.removeEventListener('pointercancel', finishIntroCatDrag);
catCanvas.style.pointerEvents = '';
catCanvas.style.touchAction = '';
document.body.style.cursor = '';
  introMixers.forEach((mixer) => mixer.stopAllAction());

  disposeObject(introScene);
  renderer.dispose();
};
  }, [onFinished, preloadStore]);

  useEffect(() => {
    if (!showTranslateModal) return undefined;

    const handleTranslateKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowTranslateModal(false);
      }
    };

    window.addEventListener('keydown', handleTranslateKeyDown);

    return () => {
      window.removeEventListener('keydown', handleTranslateKeyDown);
    };
  }, [showTranslateModal]);

  useEffect(() => {
    if (!showTranslateModal || !translateGlbStageRef.current) return undefined;

    const stage = translateGlbStageRef.current;

    let disposed = false;
    let animationFrame = 0;
    let renderer = null;
    let scene = null;
    let camera = null;
    let heartGroup = null;
    let resizeObserver = null;
    let jewelryEnvironmentTexture = null;

    let pointerDown = false;
    let lastX = 0;
    let lastY = 0;
    let targetRotX = -0.12;
    let targetRotY = 0.35;
    let currentRotX = targetRotX;
    let currentRotY = targetRotY;

    const createJewelryEnvironmentTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;

      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

      gradient.addColorStop(0.0, '#ffffff');
      gradient.addColorStop(0.18, '#ffe4f6');
      gradient.addColorStop(0.38, '#dff4ff');
      gradient.addColorStop(0.58, '#f2e4ff');
      gradient.addColorStop(0.78, '#fff8fe');
      gradient.addColorStop(1.0, '#c7edff');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 42, canvas.width, 18);
      ctx.fillRect(0, 126, canvas.width, 12);
      ctx.fillRect(0, 198, canvas.width, 22);

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ffb7dc';
      ctx.fillRect(0, 82, canvas.width, 16);

      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#aedbff';
      ctx.fillRect(0, 164, canvas.width, 14);

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      return texture;
    };

    const makeGlossyJewelryMaterial = (sourceMaterial, meshName = '') => {
      const source = sourceMaterial || {};
      const lowerName = meshName.toLowerCase();
      const looksLikeGem =
        /sparkle|gem|crystal|diamond|star|jewel|shine|light/i.test(lowerName);

      const sourceColor = source.color?.clone?.() || new THREE.Color(looksLikeGem ? '#fff6fd' : '#ff9fce');
      const targetColor = looksLikeGem
        ? new THREE.Color('#fff8ff')
        : new THREE.Color('#ffabd1');

      sourceColor.lerp(targetColor, looksLikeGem ? 0.72 : 0.38);

      const material = new THREE.MeshStandardMaterial({
        name: `${source.name || meshName || 'sparkle'}_glossy_jewelry`,
        color: sourceColor,

        map: source.map || null,
        normalMap: source.normalMap || null,
        roughnessMap: source.roughnessMap || null,
        metalnessMap: source.metalnessMap || null,
        emissiveMap: source.emissiveMap || null,
        aoMap: source.aoMap || null,

        metalness: 0.45,
roughness: 0.18,

        emissive: new THREE.Color(looksLikeGem ? '#ffe6f6' : '#ff7fbd'),
        emissiveIntensity: looksLikeGem ? 0.24 : 0.1,

        envMapIntensity: looksLikeGem ? 2.6 : 2.15,
        flatShading: false,
        transparent: true,

// Fully solid SparkleHeart, no opacity/transparency
transparent: false,
opacity: 1,
alphaTest: 0,
depthWrite: true,
depthTest: true,
side: source.side ?? THREE.FrontSide,
      });

      [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.emissiveMap,
        material.aoMap,
      ].forEach((texture) => {
        if (!texture) return;

        texture.colorSpace = texture === material.map || texture === material.emissiveMap
          ? THREE.SRGBColorSpace
          : texture.colorSpace;

        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
      });

      return material;
    };

    setTranslateGlbStatusKey('loadingGlossyJewelry');

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.035);

    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    camera.position.set(0, 0.12, 8.2);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.domElement.className = 'shoppingIntroTranslateGlbCanvas';

    stage.appendChild(renderer.domElement);

    jewelryEnvironmentTexture = createJewelryEnvironmentTexture();
    scene.environment = jewelryEnvironmentTexture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd4c4ff, 2.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 5.2);
    keyLight.position.set(3.6, 4.8, 5.8);
    scene.add(keyLight);

    const frontShineLight = new THREE.DirectionalLight(0xffffff, 2.8);
    frontShineLight.position.set(-1.8, 1.2, 6.2);
    scene.add(frontShineLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
    rimLight.position.set(-4.8, 3.0, -3.2);
    scene.add(rimLight);

    const pinkLight = new THREE.PointLight(0xff9fce, 10.5, 16);
    pinkLight.position.set(-3.2, 2.2, 3.6);
    scene.add(pinkLight);

    const blueLight = new THREE.PointLight(0xb7dcff, 9.2, 16);
    blueLight.position.set(3.4, -0.4, 3.9);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xd5b8ff, 8.4, 16);
    purpleLight.position.set(0, 4.0, -2.8);
    scene.add(purpleLight);

    const whiteSparkLight = new THREE.PointLight(0xffffff, 5.8, 10);
    whiteSparkLight.position.set(0, 0.4, 4.6);
    scene.add(whiteSparkLight);

    heartGroup = new THREE.Group();
    heartGroup.name = 'ShoppingIntroTranslateHeartGroup';
    heartGroup.scale.setScalar(1.0);
    scene.add(heartGroup);

    const starGeometry = new THREE.IcosahedronGeometry(0.022, 0);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
    });

    const stars = new THREE.Group();
    stars.name = 'ShoppingIntroTranslateSparkles';

    for (let i = 0; i < 110; i += 1) {
      const star = new THREE.Mesh(starGeometry, starMaterial);

      star.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        -4 - Math.random() * 4,
      );

      star.scale.setScalar(0.6 + Math.random() * 2.2);
      stars.add(star);
    }

    scene.add(stars);

    const resizeTranslateRenderer = () => {
      if (!renderer || !camera || !stage) return;

      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onTranslatePointerDown = (event) => {
      if (event.target.closest?.('.shoppingIntroTranslateFlagButton')) return;

      pointerDown = true;
      lastX = event.clientX;
      lastY = event.clientY;

      try {
        renderer.domElement.setPointerCapture(event.pointerId);
      } catch {}
    };

    const onTranslatePointerMove = (event) => {
      if (!pointerDown) return;

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;

      lastX = event.clientX;
      lastY = event.clientY;

      targetRotY += dx * 0.008;
      targetRotX += dy * 0.006;
      targetRotX = clampNumber(targetRotX, -0.75, 0.65);
    };

    const onTranslatePointerUp = () => {
      pointerDown = false;
    };

    const animateTranslateHeart = (time) => {
      if (disposed || !renderer || !scene || !camera || !heartGroup) return;

      const t = time * 0.001;

      currentRotX += (targetRotX - currentRotX) * 0.07;
      currentRotY += (targetRotY - currentRotY) * 0.07;

      if (!pointerDown) {
        targetRotY += 0.0024;
      }

      whiteSparkLight.intensity = 5.3 + Math.sin(t * 3.2) * 1.2;
      whiteSparkLight.position.x = Math.sin(t * 1.1) * 1.3;

      heartGroup.rotation.x = currentRotX + Math.sin(t * 1.7) * 0.02;
      heartGroup.rotation.y = currentRotY;
      heartGroup.rotation.z = Math.sin(t * 1.25) * 0.02;
      heartGroup.position.y = Math.sin(t * 2.1) * 0.045;

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animateTranslateHeart);
    };

    renderer.domElement.addEventListener('pointerdown', onTranslatePointerDown);
    renderer.domElement.addEventListener('pointermove', onTranslatePointerMove);
    window.addEventListener('pointerup', onTranslatePointerUp);

    resizeObserver = new ResizeObserver(resizeTranslateRenderer);
    resizeObserver.observe(stage);

    resizeTranslateRenderer();
    animationFrame = requestAnimationFrame(animateTranslateHeart);

    loadSceneGLTF(preloadStore, SPARKLE_HEART_MODEL_URL)
      .then((gltf) => {
        if (disposed || !gltf?.scene || !heartGroup) return;

        const heartModel = gltf.scene;
        heartModel.name = 'ShoppingIntroTranslateSparkleHeart';

        heartModel.traverse((child) => {
          if (!child.isMesh) return;

          child.castShadow = false;
          child.receiveShadow = false;

          if (child.geometry && !child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }

          if (Array.isArray(child.material)) {
            child.material = child.material.map((material) =>
              makeGlossyJewelryMaterial(material, child.name),
            );
          } else {
            child.material = makeGlossyJewelryMaterial(child.material, child.name);
          }
        });

        const box = new THREE.Box3().setFromObject(heartModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        heartModel.position.sub(center);

        if (size.y > 0) {
          heartModel.scale.multiplyScalar(1.45 / size.y);
        }

        heartGroup.add(heartModel);
        setTranslateGlbStatusKey('chooseLanguage');
      })
      .catch((error) => {
        console.error('Could not load intro translate sparkle heart GLB:', error);
        setTranslateGlbStatusKey('couldNotLoadGlb');
      });

    return () => {
      disposed = true;

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      resizeObserver?.disconnect?.();

      renderer?.domElement?.removeEventListener('pointerdown', onTranslatePointerDown);
      renderer?.domElement?.removeEventListener('pointermove', onTranslatePointerMove);
      window.removeEventListener('pointerup', onTranslatePointerUp);

      if (scene) {
        disposeObject(scene);
      }

      jewelryEnvironmentTexture?.dispose?.();

      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
    };
  }, [showTranslateModal, preloadStore]);

  return (
    <div className={`shoppingIntroSplash${isFading ? ' isFading' : ''}`}>
      <canvas
        ref={bubbleCanvasRef}
        className="shoppingIntroBubbleCanvas"
        aria-hidden="true"
      />

      <canvas
        ref={catCanvasRef}
        className="shoppingIntroCatCanvas"
        aria-hidden="true"
      />

      <div className="shoppingIntroPreviewText">
  <a
    href="https://www.almostmadeinjapan.com/home"
    className="shoppingIntroLogoLink"
    aria-label={languageCopy.logoAlt}
  >
    <img
      src="/images/almostmadeinjapan.png"
      alt={languageCopy.logoAlt}
      className="shoppingIntroLogo"
      draggable="false"
    />
  </a>

        <button
  type="button"
  className="shoppingIntroTranslateButton"
  aria-label={languageCopy.translate}
  aria-expanded={showTranslateModal}
  onClick={() => setShowTranslateModal(true)}
>
  <img
    src="/images/translate-icon.png"
    alt=""
    aria-hidden="true"
    draggable="false"
  />
</button>

        <div ref={textCardRef} className="shoppingIntroTextCard">
          <h1 className="shoppingIntroText">
            {languageCopy.introLine1}
            <span>{languageCopy.introLine2}</span>
          </h1>
        </div>
        
<button
  ref={enterButtonRef}
  type="button"
  className="shoppingIntroEnterButton"
  onClick={() => requestIntroExitRef.current?.()}
  disabled={introExitRequested}
  aria-label={languageCopy.enterWebsite}
>
  {introExitRequested ? languageCopy.entering : languageCopy.enterPortal}
</button>

      </div>

      {showTranslateModal && (
        <div
          className="shoppingIntroTranslateModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label={formatCopy(languageCopy.translateTo, { language: selectedTranslateLanguageName })}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowTranslateModal(false);
            }
          }}
        >
          <div className="shoppingIntroTranslateModalCard">
            <div className="shoppingIntroTranslateModalHeader">
              <span className="shoppingIntroTranslateModalTitle">
                {formatCopy(languageCopy.translateTo, { language: selectedTranslateLanguageName })}
              </span>

              <button
                type="button"
                className="shoppingIntroTranslateModalClose"
                aria-label={languageCopy.closeTranslatePopup}
                onClick={() => setShowTranslateModal(false)}
              >
                ×
              </button>
            </div>

            <div className="shoppingIntroTranslateLanguageOrbit" aria-label={languageCopy.chooseTranslationLanguage}>
              {TRANSLATE_LANGUAGE_OPTIONS.map((language, index) => {
                const angle =
                  (index / TRANSLATE_LANGUAGE_OPTIONS.length) * Math.PI * 2 -
                  Math.PI / 2;

                return (
                  <button
                    key={language.code}
                    type="button"
                    className={`shoppingIntroTranslateFlagButton${
                      selectedTranslateLanguageCode === language.code ? ' isActive' : ''
                    }`}
                    style={{
                      left: `${50 + Math.cos(angle) * 39}%`,
                      top: `${50 + Math.sin(angle) * 39}%`,
                    }}
                    aria-label={formatCopy(languageCopy.translateToLanguage, { language: language.nativeName || language.name })}
                    aria-pressed={selectedTranslateLanguageCode === language.code}
                    onClick={() => onLanguageChange?.(language.code)}
                  >
                    <img
  className="shoppingIntroTranslateFlagImage"
  src={language.flag}
  alt=""
  aria-hidden="true"
  draggable="false"
/>
<span className="shoppingIntroTranslateFlagCode">{language.short}</span>
      
                  </button>
                );
              })}
            </div>

            <div ref={translateGlbStageRef} className="shoppingIntroTranslateGlbStage">
              <div className="shoppingIntroTranslateGlbLoading">
                {languageCopy[translateGlbStatusKey] || languageCopy.chooseLanguage}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionMiniGlobe() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let frame = 0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const globe = createPinkWireframeGlobe();

    // Reset the big water-scene placement so the same globe becomes tiny here.
    globe.position.set(0, 0, 0);
    globe.scale.setScalar(0.92);
    globe.rotation.set(-0.18, 0, 0.08);

    globe.traverse((child) => {
      child.renderOrder = 1000;
      child.frustumCulled = false;
    });

    scene.add(globe);

    const resize = () => {
      const size = Math.max(1, canvas.clientWidth || 110);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);

      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size, false);

      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.05);

      globe.rotation.y += delta * 0.72;
      globe.rotation.x = -0.18 + Math.sin(clock.elapsedTime * 0.5) * 0.035;
      globe.rotation.z = 0.08 + Math.cos(clock.elapsedTime * 0.42) * 0.025;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      disposeObject(scene);
      renderer.dispose();
    };
  }, []);

  return <canvas className="collectionMiniGlobeCanvas" ref={canvasRef} />;
}


function CosmicRunnerGameOverlay({ modelPath = CAT_MODEL_URL, onClose }) {
  const mountRef = useRef(null);
  const scoreTextRef = useRef(null);
  const bestTextRef = useRef(null);
  const statusTextRef = useRef(null);
  const gameOverRef = useRef(null);
  const restartRef = useRef(null);
  const jumpRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let frameId = 0;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xfff6ff, 10, 42);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.01, 100);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xd8c4ff, 2.8);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(4, 8, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    scene.add(sun);

    const runnerColors = {
      pink: '#ff75dc',
      hotPink: '#ff3fc9',
      blue: '#6fdfff',
      purple: '#b184ff',
      yellow: '#fff0a3',
      white: '#fff8ff',
      ink: '#4b2864',
    };

    const RUNNER_X = -1.15;
    const OBSTACLE_START_X = 5.2;
    const OBSTACLE_REMOVE_X = -4.4;

    const runner = new THREE.Group();
    runner.position.set(RUNNER_X, 0, 0);
    scene.add(runner);

    let runnerVisual = null;
    let mixer = null;
    const mixerClock = new THREE.Clock();

    const setStatus = (text) => {
      if (statusTextRef.current) statusTextRef.current.textContent = text;
    };

    const clearRunnerVisual = () => {
      if (!runnerVisual) return;
      runner.remove(runnerVisual);
      disposeObject(runnerVisual);
      runnerVisual = null;
      mixer = null;
    };

    const setRunnerVisual = (object) => {
      clearRunnerVisual();
      runnerVisual = object;
      runner.add(runnerVisual);
    };

    const makeFallbackRunner = () => {
      const group = new THREE.Group();

      const bodyMat = new THREE.MeshStandardMaterial({
        color: runnerColors.pink,
        roughness: 0.38,
        metalness: 0.04,
        emissive: '#ff8fe7',
        emissiveIntensity: 0.05,
      });

      const bellyMat = new THREE.MeshStandardMaterial({
        color: runnerColors.white,
        roughness: 0.55,
      });

      const blueMat = new THREE.MeshStandardMaterial({
        color: runnerColors.blue,
        roughness: 0.35,
        metalness: 0.06,
        emissive: '#9ee8ff',
        emissiveIntensity: 0.08,
      });

      const eyeMat = new THREE.MeshStandardMaterial({
        color: runnerColors.ink,
        roughness: 0.25,
      });

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.42, 0.84, 14, 26),
        bodyMat,
      );
      body.position.y = 0.86;
      body.rotation.z = -0.08;
      body.castShadow = true;
      group.add(body);

      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), bellyMat);
      belly.position.set(0.06, 0.78, 0.38);
      belly.scale.set(1.0, 1.22, 0.34);
      belly.castShadow = true;
      group.add(belly);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 20), bodyMat);
      head.position.set(0.1, 1.52, 0);
      head.scale.set(1.08, 0.9, 1);
      head.castShadow = true;
      group.add(head);

      const earGeo = new THREE.ConeGeometry(0.19, 0.46, 4);
      const leftEar = new THREE.Mesh(earGeo, bodyMat);
      leftEar.position.set(-0.26, 1.95, 0);
      leftEar.rotation.set(0.05, Math.PI / 4, 0.28);
      leftEar.castShadow = true;
      group.add(leftEar);

      const rightEar = leftEar.clone();
      rightEar.position.x = 0.42;
      rightEar.rotation.z = -0.28;
      group.add(rightEar);

      const eyeGeo = new THREE.SphereGeometry(0.065, 12, 8);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.11, 1.6, 0.41);
      group.add(eyeL);

      const eyeR = eyeL.clone();
      eyeR.position.x = 0.28;
      group.add(eyeR);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), blueMat);
      nose.position.set(0.085, 1.49, 0.455);
      nose.scale.set(1, 0.75, 0.75);
      group.add(nose);

      const legGeo = new THREE.CapsuleGeometry(0.105, 0.38, 8, 12);
      const legL = new THREE.Mesh(legGeo, bodyMat);
      legL.position.set(-0.18, 0.28, 0.04);
      legL.castShadow = true;
      group.add(legL);

      const legR = legL.clone();
      legR.position.x = 0.26;
      group.add(legR);

      const tail = new THREE.Mesh(
        new THREE.TorusGeometry(0.27, 0.052, 10, 32, Math.PI * 1.35),
        blueMat,
      );
      tail.position.set(-0.42, 0.84, -0.08);
      tail.rotation.set(1.32, 0.2, 0.72);
      tail.castShadow = true;
      group.add(tail);

      const antennaMat = new THREE.MeshStandardMaterial({
        color: runnerColors.yellow,
        roughness: 0.3,
        emissive: runnerColors.yellow,
        emissiveIntensity: 0.35,
      });

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), antennaMat);
      orb.position.set(0.08, 2.18, 0.02);
      orb.castShadow = true;
      group.add(orb);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8),
        antennaMat,
      );
      stem.position.set(0.08, 2.02, 0.01);
      stem.rotation.z = 0.12;
      group.add(stem);

      group.scale.setScalar(1.12);
      group.rotation.y = -0.24;
      return group;
    };

    const fitGLBToRunner = (object) => {
      const wrapper = new THREE.Group();
      wrapper.add(object);

      object.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      object.position.sub(center);

      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const targetHeight = 2.15;
      const scale = targetHeight / maxAxis;

      wrapper.scale.setScalar(scale);
      wrapper.position.y = targetHeight * 0.5;
      wrapper.rotation.y = Math.PI / 2;

      wrapper.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          child.material = child.material.clone();
          child.material.roughness = Math.min(0.9, child.material.roughness ?? 0.55);
        }
      });

      return wrapper;
    };

    setRunnerVisual(makeFallbackRunner());
    setStatus('Loading alien cat runner...');

    if (modelPath) {
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          if (disposed) return;

          const fitted = fitGLBToRunner(gltf.scene);
          setRunnerVisual(fitted);

          if (gltf.animations?.length) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            mixer.clipAction(gltf.animations[0]).play();
            setStatus('Alien cat GLB loaded with animation.');
          } else {
            setStatus('Alien cat GLB loaded.');
          }
        },
        undefined,
        () => {
          if (!disposed) setStatus('GLB missing, using built-in runner.');
        },
      );
    }

    const groundGroup = new THREE.Group();
    scene.add(groundGroup);

    const groundMat = new THREE.MeshStandardMaterial({
      color: runnerColors.blue,
      roughness: 0.64,
      metalness: 0.02,
    });

    for (let i = 0; i < 3; i += 1) {
      const ground = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 5.4), groundMat);
      ground.position.set(i * 22 - 22, -0.13, 0);
      ground.receiveShadow = true;
      groundGroup.add(ground);
    }

    const stripeMat = new THREE.MeshStandardMaterial({
      color: runnerColors.pink,
      roughness: 0.52,
    });

    const stripes = [];
    for (let i = 0; i < 18; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.045, 0.12), stripeMat);
      stripe.position.set(i * 2.2 - 12, 0.025, 2.12);
      stripe.receiveShadow = true;
      scene.add(stripe);
      stripes.push(stripe);
    }

    const obstacleGroup = new THREE.Group();
    const obstacles = [];
    scene.add(obstacleGroup);

    const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

    const makeObstacle = () => {
      const group = new THREE.Group();
      const obstacleHeight = THREE.MathUtils.randFloat(0.68, 1.22);
      const obstacleWidth = THREE.MathUtils.randFloat(0.28, 0.48);

      const mat = new THREE.MeshStandardMaterial({
        color: randomItem([
          runnerColors.hotPink,
          runnerColors.purple,
          runnerColors.blue,
          runnerColors.yellow,
        ]),
        roughness: 0.31,
        metalness: 0.08,
        emissive: '#ffffff',
        emissiveIntensity: 0.08,
      });

      const crystal = new THREE.Mesh(new THREE.ConeGeometry(obstacleWidth, obstacleHeight, 5), mat);
      crystal.position.y = obstacleHeight / 2;
      crystal.rotation.y = Math.random() * Math.PI;
      crystal.castShadow = true;
      crystal.receiveShadow = true;
      group.add(crystal);

      const base = new THREE.Mesh(new THREE.SphereGeometry(obstacleWidth * 0.62, 12, 8), mat);
      base.position.y = 0.16;
      base.scale.y = 0.42;
      base.castShadow = true;
      group.add(base);

      group.userData.width = obstacleWidth * 1.1;
      group.userData.height = obstacleHeight;
      group.userData.spin = THREE.MathUtils.randFloat(-2, 2);

      return group;
    };

    const spawnObstacle = (x = OBSTACLE_START_X) => {
      const obstacle = makeObstacle();
      obstacle.position.set(x, 0, THREE.MathUtils.randFloat(-0.18, 0.18));
      obstacleGroup.add(obstacle);
      obstacles.push(obstacle);
    };

    const sparkles = [];
    const sparkleMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      emissive: runnerColors.pink,
      emissiveIntensity: 0.62,
    });

    for (let i = 0; i < 30; i += 1) {
      const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), sparkleMat);
      sparkle.position.set(
        THREE.MathUtils.randFloat(-5.5, 8),
        THREE.MathUtils.randFloat(2.1, 5.5),
        THREE.MathUtils.randFloat(-2.4, 1.3),
      );
      sparkle.userData.speed = THREE.MathUtils.randFloat(0.7, 1.8);
      sparkle.userData.spin = THREE.MathUtils.randFloat(1, 4);
      scene.add(sparkle);
      sparkles.push(sparkle);
    }

    let velocityY = 0;
    let grounded = true;
    let running = true;
    let speed = 4.3;
    let score = 0;
    let best = Number(window.localStorage.getItem('cosmicRunnerBest') || 0);
    let elapsed = 0;
    let nextSpawn = 1.1;
    let last = performance.now();

    const playerBox = new THREE.Box3();
    const obstacleBox = new THREE.Box3();

    const updateScoreText = () => {
      if (scoreTextRef.current) scoreTextRef.current.textContent = String(score);
      if (bestTextRef.current) bestTextRef.current.textContent = String(best);
    };

    const restart = () => {
      running = true;
      speed = 4.3;
      score = 0;
      elapsed = 0;
      nextSpawn = 1.1;
      velocityY = 0;
      grounded = true;

      runner.position.set(RUNNER_X, 0, 0);
      runner.rotation.set(0, 0, 0);
      runner.scale.set(1, 1, 1);

      if (gameOverRef.current) gameOverRef.current.classList.remove('show');

      for (const obstacle of obstacles) {
        obstacleGroup.remove(obstacle);
        disposeObject(obstacle);
      }

      obstacles.length = 0;
      spawnObstacle(4.8);
      updateScoreText();
    };

    const endGame = () => {
      running = false;

      if (gameOverRef.current) gameOverRef.current.classList.add('show');

      if (score > best) {
        best = score;
        window.localStorage.setItem('cosmicRunnerBest', String(best));
        updateScoreText();
      }
    };

    const jump = () => {
      if (!running) {
        restart();
        return;
      }

      if (!grounded) return;

      velocityY = 0.26;
      grounded = false;
    };

    restartRef.current = restart;
    jumpRef.current = jump;

    const intersectsObstacle = (obstacle) => {
      playerBox.setFromCenterAndSize(
        new THREE.Vector3(runner.position.x, runner.position.y + 0.92, runner.position.z),
        new THREE.Vector3(0.72, 1.55, 0.82),
      );

      obstacleBox.setFromCenterAndSize(
        new THREE.Vector3(
          obstacle.position.x,
          obstacle.position.y + obstacle.userData.height / 2,
          obstacle.position.z,
        ),
        new THREE.Vector3(obstacle.userData.width, obstacle.userData.height, 0.76),
      );

      return playerBox.intersectsBox(obstacleBox);
    };

    const updateGround = (delta) => {
      groundGroup.children.forEach((ground) => {
        ground.position.x -= speed * delta;
        if (ground.position.x < -22) ground.position.x += 66;
      });

      stripes.forEach((stripe) => {
        stripe.position.x -= speed * delta;
        if (stripe.position.x < -12) stripe.position.x += 39.6;
      });
    };

    const updateSparkles = (delta) => {
      sparkles.forEach((sparkle) => {
        sparkle.position.x -= sparkle.userData.speed * delta;
        sparkle.rotation.x += sparkle.userData.spin * delta;
        sparkle.rotation.y += sparkle.userData.spin * delta * 0.8;

        if (sparkle.position.x < -5.8) {
          sparkle.position.x = THREE.MathUtils.randFloat(5.8, 8.8);
          sparkle.position.y = THREE.MathUtils.randFloat(2.1, 5.5);
          sparkle.position.z = THREE.MathUtils.randFloat(-2.4, 1.3);
        }
      });
    };

    const resize = () => {
      const viewWidth = mount.clientWidth || window.innerWidth || 390;
      const viewHeight = mount.clientHeight || window.innerHeight || 844;

      camera.aspect = viewWidth / viewHeight;
      camera.updateProjectionMatrix();

      if (viewHeight >= viewWidth) {
        camera.position.set(0, 2.95, 6.65);
      } else {
        camera.position.set(0, 2.65, 6.2);
      }

      camera.lookAt(-0.35, 1.12, 0);

      renderer.setSize(viewWidth, viewHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    };

    const animate = (now) => {
      if (disposed) return;

      frameId = requestAnimationFrame(animate);

      const delta = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (mixer) mixer.update(mixerClock.getDelta());

      updateSparkles(delta);

      if (running) {
        elapsed += delta;
        speed += delta * 0.11;
        score = Math.floor(elapsed * 10);
        updateScoreText();

        velocityY -= 0.62 * delta;
        runner.position.y += velocityY;

        if (runner.position.y <= 0) {
          runner.position.y = 0;
          velocityY = 0;
          grounded = true;
        }

        const bounce = Math.sin(now * 0.018) * 0.025;
        runner.scale.set(1 + bounce, 1 - bounce * 0.7, 1 + bounce);
        runner.rotation.z = grounded ? Math.sin(now * 0.014) * 0.035 : -0.18;

        updateGround(delta);

        nextSpawn -= delta;

        if (nextSpawn <= 0) {
          spawnObstacle(OBSTACLE_START_X);
          nextSpawn =
            THREE.MathUtils.randFloat(0.86, 1.48) * Math.max(0.72, 5.0 / speed);
        }

        for (let i = obstacles.length - 1; i >= 0; i -= 1) {
          const obstacle = obstacles[i];
          obstacle.position.x -= speed * delta;
          obstacle.rotation.y += obstacle.userData.spin * delta;

          if (intersectsObstacle(obstacle)) endGame();

          if (obstacle.position.x < OBSTACLE_REMOVE_X) {
            obstacleGroup.remove(obstacle);
            disposeObject(obstacle);
            obstacles.splice(i, 1);
          }
        }
      } else {
        runner.rotation.z += delta * 1.8;
      }

      renderer.render(scene, camera);
    };

    const onPointerDown = (event) => {
      if (event.target.closest('button')) return;
      jump();
    };

    const onKeyDown = (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jump();
      }

      if (event.code === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    restart();
    resize();

    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    mount.addEventListener('pointerdown', onPointerDown);

    frameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      mount.removeEventListener('pointerdown', onPointerDown);

      clearRunnerVisual();
      disposeObject(scene);

      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      renderer.dispose();
      renderer.forceContextLoss?.();
    };
  }, [modelPath, onClose]);

  return (
    <div
      className="cosmicRunnerGameOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Runner game"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 18% 18%, rgba(255,175,237,.9), transparent 32%), radial-gradient(circle at 82% 12%, rgba(160,225,255,.9), transparent 34%), radial-gradient(circle at 50% 100%, rgba(206,177,255,.75), transparent 42%), linear-gradient(180deg, #fff8ff 0%, #f4fbff 52%, #fff0fb 100%)',
      }}
    >
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      <div
        style={{
          position: 'fixed',
          top: 'max(14px, env(safe-area-inset-top))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(94vw, 560px)',
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={cosmicRunnerGlassHudStyle}>
          <span>
            Score: <b ref={scoreTextRef}>0</b>
          </span>
          <span>
            Best: <b ref={bestTextRef}>0</b>
          </span>
        </div>

        <button
          type="button"
          onClick={() => jumpRef.current?.()}
          style={cosmicRunnerPillButtonStyle}
        >
          Jump
        </button>

        <button
          type="button"
          onClick={onClose}
          style={cosmicRunnerPillButtonStyle}
        >
          Close
        </button>
      </div>

      <div
        ref={statusTextRef}
        style={{
          position: 'fixed',
          left: '50%',
          top: 76,
          transform: 'translateX(-50%)',
          zIndex: 2,
          width: 'min(92vw, 560px)',
          padding: '10px 14px',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: '#75468f',
          border: '1px solid rgba(255,255,255,.76)',
          background: 'rgba(255,255,255,.42)',
          backdropFilter: 'blur(18px)',
          borderRadius: 22,
          boxShadow: '0 14px 46px rgba(168,100,220,.18)',
        }}
      >
        Loading runner...
      </div>

      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 18px)',
          transform: 'translateX(-50%)',
          zIndex: 2,
          width: 'min(92vw, 560px)',
          padding: '13px 16px',
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 800,
          color: '#87589c',
          border: '1px solid rgba(255,255,255,.76)',
          background: 'rgba(255,255,255,.42)',
          backdropFilter: 'blur(18px)',
          borderRadius: 22,
          boxShadow: '0 14px 46px rgba(168,100,220,.18)',
        }}
      >
        Tap / click / Space to jump.
      </div>

      <div
        ref={gameOverRef}
        className="cosmicRunnerGameOver"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 3,
          display: 'none',
          width: 'min(86vw, 420px)',
          padding: 24,
          textAlign: 'center',
          color: '#75468f',
          border: '1px solid rgba(255,255,255,.76)',
          background: 'rgba(255,255,255,.5)',
          backdropFilter: 'blur(18px)',
          borderRadius: 24,
          boxShadow: '0 14px 46px rgba(168,100,220,.18)',
        }}
      >
        <style>{`.cosmicRunnerGameOver.show { display: block !important; }`}</style>
        <h2 style={{ margin: '0 0 8px', color: '#703b8f', fontSize: 34 }}>bonk!</h2>
        <p style={{ margin: '0 0 14px', fontWeight: 800 }}>
          The runner crashed into a crystal.
        </p>
        <button
          type="button"
          onClick={() => restartRef.current?.()}
          style={cosmicRunnerPillButtonStyle}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

const cosmicRunnerGlassHudStyle = {
  pointerEvents: 'auto',
  border: '1px solid rgba(255,255,255,.76)',
  background: 'rgba(255,255,255,.42)',
  backdropFilter: 'blur(18px)',
  borderRadius: 22,
  boxShadow: '0 14px 46px rgba(168,100,220,.18)',
  color: '#75468f',
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 900,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
};

const cosmicRunnerPillButtonStyle = {
  border: 0,
  borderRadius: 999,
  padding: '12px 14px',
  fontSize: 12,
  fontWeight: 900,
  color: '#714184',
  background: 'linear-gradient(135deg, #ffd2f5, #ccefff)',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.8)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function CosmicVoyage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const preloadStoreRef = useRef(null);

  if (!preloadStoreRef.current) {
    preloadStoreRef.current = createPreloadStore();
  }

  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [runnerGameOpen, setRunnerGameOpen] = useState(false);
  const [ringPopupOpen, setRingPopupOpen] = useState(false);
  const [ringPopupPlacement, setRingPopupPlacement] = useState({
    left: 72,
    top: 180,
    arrowLeft: 58,
  });
  const [ringTerminalText, setRingTerminalText] = useState('');
  const ringTerminalRef = useRef(null);
  const [landedUI, setLandedUI] = useState(false);
  const [modelError, setModelError] = useState('');
  const [movingBgSymbols, setMovingBgSymbols] = useState([]);
  const [introFinished, setIntroFinished] = useState(false);
  const [coreModelsReady, setCoreModelsReady] = useState(false);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE_CODE;

    return window.localStorage.getItem('amij-language-code') || DEFAULT_LANGUAGE_CODE;
  });
  const [showMainTranslateModal, setShowMainTranslateModal] = useState(false);
  const mainTranslateGlbStageRef = useRef(null);
  const [mainTranslateGlbStatusKey, setMainTranslateGlbStatusKey] = useState('chooseLanguage');
  const copy = useMemo(() => getSiteCopy(selectedLanguageCode), [selectedLanguageCode]);
  const selectedMainTranslateLanguage =
    TRANSLATE_LANGUAGE_OPTIONS.find((language) => language.code === selectedLanguageCode) ||
    TRANSLATE_LANGUAGE_OPTIONS[0];
  const selectedMainTranslateLanguageName =
    selectedMainTranslateLanguage.nativeName || selectedMainTranslateLanguage.name;
  const finishIntro = useCallback(() => setIntroFinished(true), []);
  const closeRingPopup = useCallback(() => setRingPopupOpen(false), []);

  const shareWebsite = useCallback(async () => {
  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : 'https://www.almostmadeinjapan.com/';

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: 'Almost Made in Japan',
        url: shareUrl,
      });
    } catch {
      // User cancelled native share sheet.
    }

    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard can be blocked in some browsers.
    }
  }
}, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('amij-language-code', selectedLanguageCode);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = getDocumentLangCode(selectedLanguageCode);
    }
  }, [selectedLanguageCode]);


  useEffect(() => {
    if (!showMainTranslateModal || !mainTranslateGlbStageRef.current) return undefined;

    const stage = mainTranslateGlbStageRef.current;

    let disposed = false;
    let animationFrame = 0;
    let renderer = null;
    let scene = null;
    let camera = null;
    let heartGroup = null;
    let resizeObserver = null;
    let jewelryEnvironmentTexture = null;

    let pointerDown = false;
    let lastX = 0;
    let lastY = 0;
    let targetRotX = -0.12;
    let targetRotY = 0.35;
    let currentRotX = targetRotX;
    let currentRotY = targetRotY;

    const createJewelryEnvironmentTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;

      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

      gradient.addColorStop(0.0, '#ffffff');
      gradient.addColorStop(0.18, '#ffe4f6');
      gradient.addColorStop(0.38, '#dff4ff');
      gradient.addColorStop(0.58, '#f2e4ff');
      gradient.addColorStop(0.78, '#fff8fe');
      gradient.addColorStop(1.0, '#c7edff');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 42, canvas.width, 18);
      ctx.fillRect(0, 126, canvas.width, 12);
      ctx.fillRect(0, 198, canvas.width, 22);

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ffb7dc';
      ctx.fillRect(0, 82, canvas.width, 16);

      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#aedbff';
      ctx.fillRect(0, 164, canvas.width, 14);

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      return texture;
    };

    const makeGlossyJewelryMaterial = (sourceMaterial, meshName = '') => {
      const source = sourceMaterial || {};
      const lowerName = meshName.toLowerCase();
      const looksLikeGem =
        /sparkle|gem|crystal|diamond|star|jewel|shine|light/i.test(lowerName);

      const sourceColor = source.color?.clone?.() || new THREE.Color(looksLikeGem ? '#fff6fd' : '#ff9fce');
      const targetColor = looksLikeGem
        ? new THREE.Color('#fff8ff')
        : new THREE.Color('#ffabd1');

      sourceColor.lerp(targetColor, looksLikeGem ? 0.72 : 0.38);

      const material = new THREE.MeshStandardMaterial({
        name: `${source.name || meshName || 'sparkle'}_glossy_jewelry`,
        color: sourceColor,

        map: source.map || null,
        normalMap: source.normalMap || null,
        roughnessMap: source.roughnessMap || null,
        metalnessMap: source.metalnessMap || null,
        emissiveMap: source.emissiveMap || null,
        aoMap: source.aoMap || null,

        metalness: 0.45,
roughness: 0.18,

        emissive: new THREE.Color(looksLikeGem ? '#ffe6f6' : '#ff7fbd'),
        emissiveIntensity: looksLikeGem ? 0.24 : 0.1,

        envMapIntensity: looksLikeGem ? 2.6 : 2.15,
        flatShading: false,
        transparent: true,

// Fully solid SparkleHeart, no opacity/transparency
transparent: false,
opacity: 1,
alphaTest: 0,
depthWrite: true,
depthTest: true,
side: source.side ?? THREE.FrontSide,
      });

      [
        material.map,
        material.normalMap,
        material.roughnessMap,
        material.metalnessMap,
        material.emissiveMap,
        material.aoMap,
      ].forEach((texture) => {
        if (!texture) return;

        texture.colorSpace = texture === material.map || texture === material.emissiveMap
          ? THREE.SRGBColorSpace
          : texture.colorSpace;

        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
      });

      return material;
    };

    setMainTranslateGlbStatusKey('loadingGlossyJewelry');

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.035);

    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    camera.position.set(0, 0.12, 8.2);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.domElement.className = 'shoppingIntroTranslateGlbCanvas';

    stage.appendChild(renderer.domElement);

    jewelryEnvironmentTexture = createJewelryEnvironmentTexture();
    scene.environment = jewelryEnvironmentTexture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd4c4ff, 2.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 5.2);
    keyLight.position.set(3.6, 4.8, 5.8);
    scene.add(keyLight);

    const frontShineLight = new THREE.DirectionalLight(0xffffff, 2.8);
    frontShineLight.position.set(-1.8, 1.2, 6.2);
    scene.add(frontShineLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
    rimLight.position.set(-4.8, 3.0, -3.2);
    scene.add(rimLight);

    const pinkLight = new THREE.PointLight(0xff9fce, 10.5, 16);
    pinkLight.position.set(-3.2, 2.2, 3.6);
    scene.add(pinkLight);

    const blueLight = new THREE.PointLight(0xb7dcff, 9.2, 16);
    blueLight.position.set(3.4, -0.4, 3.9);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xd5b8ff, 8.4, 16);
    purpleLight.position.set(0, 4.0, -2.8);
    scene.add(purpleLight);

    const whiteSparkLight = new THREE.PointLight(0xffffff, 5.8, 10);
    whiteSparkLight.position.set(0, 0.4, 4.6);
    scene.add(whiteSparkLight);

    heartGroup = new THREE.Group();
    heartGroup.name = 'MainExperienceTranslateHeartGroup';
    heartGroup.scale.setScalar(1.0);
    scene.add(heartGroup);

    const starGeometry = new THREE.IcosahedronGeometry(0.022, 0);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
    });

    const stars = new THREE.Group();
    stars.name = 'MainExperienceTranslateSparkles';

    for (let i = 0; i < 110; i += 1) {
      const star = new THREE.Mesh(starGeometry, starMaterial);

      star.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        -4 - Math.random() * 4,
      );

      star.scale.setScalar(0.6 + Math.random() * 2.2);
      stars.add(star);
    }

    scene.add(stars);

    const resizeTranslateRenderer = () => {
      if (!renderer || !camera || !stage) return;

      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onTranslatePointerDown = (event) => {
      if (event.target.closest?.('.shoppingIntroTranslateFlagButton')) return;

      pointerDown = true;
      lastX = event.clientX;
      lastY = event.clientY;

      try {
        renderer.domElement.setPointerCapture(event.pointerId);
      } catch {}
    };

    const onTranslatePointerMove = (event) => {
      if (!pointerDown) return;

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;

      lastX = event.clientX;
      lastY = event.clientY;

      targetRotY += dx * 0.008;
      targetRotX += dy * 0.006;
      targetRotX = clampNumber(targetRotX, -0.75, 0.65);
    };

    const onTranslatePointerUp = () => {
      pointerDown = false;
    };

    const animateTranslateHeart = (time) => {
      if (disposed || !renderer || !scene || !camera || !heartGroup) return;

      const t = time * 0.001;

      currentRotX += (targetRotX - currentRotX) * 0.07;
      currentRotY += (targetRotY - currentRotY) * 0.07;

      if (!pointerDown) {
        targetRotY += 0.0024;
      }

      whiteSparkLight.intensity = 5.3 + Math.sin(t * 3.2) * 1.2;
      whiteSparkLight.position.x = Math.sin(t * 1.1) * 1.3;

      heartGroup.rotation.x = currentRotX + Math.sin(t * 1.7) * 0.02;
      heartGroup.rotation.y = currentRotY;
      heartGroup.rotation.z = Math.sin(t * 1.25) * 0.02;
      heartGroup.position.y = Math.sin(t * 2.1) * 0.045;

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animateTranslateHeart);
    };

    renderer.domElement.addEventListener('pointerdown', onTranslatePointerDown);
    renderer.domElement.addEventListener('pointermove', onTranslatePointerMove);
    window.addEventListener('pointerup', onTranslatePointerUp);

    resizeObserver = new ResizeObserver(resizeTranslateRenderer);
    resizeObserver.observe(stage);

    resizeTranslateRenderer();
    animationFrame = requestAnimationFrame(animateTranslateHeart);

    loadSceneGLTF(preloadStoreRef.current, SPARKLE_HEART_MODEL_URL)
      .then((gltf) => {
        if (disposed || !gltf?.scene || !heartGroup) return;

        const heartModel = gltf.scene;
        heartModel.name = 'MainExperienceTranslateSparkleHeart';

        heartModel.traverse((child) => {
          if (!child.isMesh) return;

          child.castShadow = false;
          child.receiveShadow = false;

          if (child.geometry && !child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }

          if (Array.isArray(child.material)) {
            child.material = child.material.map((material) =>
              makeGlossyJewelryMaterial(material, child.name),
            );
          } else {
            child.material = makeGlossyJewelryMaterial(child.material, child.name);
          }
        });

        const box = new THREE.Box3().setFromObject(heartModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        heartModel.position.sub(center);

        if (size.y > 0) {
          heartModel.scale.multiplyScalar(1.45 / size.y);
        }

        heartGroup.add(heartModel);
        setMainTranslateGlbStatusKey('chooseLanguage');
      })
      .catch((error) => {
        console.error('Could not load main translate sparkle heart GLB:', error);
        setMainTranslateGlbStatusKey('couldNotLoadGlb');
      });

    return () => {
      disposed = true;

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      resizeObserver?.disconnect?.();

      renderer?.domElement?.removeEventListener('pointerdown', onTranslatePointerDown);
      renderer?.domElement?.removeEventListener('pointermove', onTranslatePointerMove);
      window.removeEventListener('pointerup', onTranslatePointerUp);

      if (scene) {
        disposeObject(scene);
      }

      jewelryEnvironmentTexture?.dispose?.();

      if (renderer?.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
    };
  }, [showMainTranslateModal]);


  const placeRingPopupFromPointer = useCallback((clientX, clientY) => {
    const viewportWidth = window.innerWidth || 390;
    const viewportHeight = window.innerHeight || 844;
    const chatWidth = Math.min(360, viewportWidth * 0.78);
    const estimatedChatHeight = Math.min(300, viewportHeight * 0.36);

    const left = clampNumber(
      clientX - chatWidth * 0.32,
      14,
      Math.max(14, viewportWidth - chatWidth - 14),
    );

    const top = clampNumber(
      clientY - estimatedChatHeight - 44,
      82,
      Math.max(82, viewportHeight - estimatedChatHeight - 24),
    );

    const arrowLeft = clampNumber(clientX - left, 34, chatWidth - 44);

    setRingPopupPlacement({
      left: Math.round(left),
      top: Math.round(top),
      arrowLeft: Math.round(arrowLeft),
    });
  }, []);

  useEffect(() => {
    if (!ringPopupOpen) {
      setRingTerminalText('');
      return undefined;
    }

    const ringMessage = copy.ringTerminalMessage || RING_TERMINAL_MESSAGE;
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(index + 2, ringMessage.length);
      setRingTerminalText(ringMessage.slice(0, index));

      if (index >= ringMessage.length) {
        window.clearInterval(timer);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [ringPopupOpen, copy.ringTerminalMessage]);

  useEffect(() => {
    if (!ringTerminalRef.current) return;
    ringTerminalRef.current.scrollTop = ringTerminalRef.current.scrollHeight;
  }, [ringTerminalText]);

  const resetExperience = () => {
    const state = stateRef.current;
    if (!state) return;

    state.landed = false;
    state.isDragging = false;
    state.hasDragged = false;
    state.dragDistancePx = 0;
    state.launching = false;
    state.launchComplete = false;
    state.launchElapsed = 0;

    state.cur.copy(START);
    state.tgt.copy(START);

    state.boatGroup.visible = true;
    state.boatGroup.position.set(0, BOAT_WATERLINE_Y, BOAT_DEPTH);
    state.boatGroup.rotation.set(0, 0, 0);
    state.boatGroup.scale.setScalar(1);

    state.catGroup.position.copy(START);
    state.catGroup.rotation.set(0, 0, 0);
    state.catGroup.scale.setScalar(1);
    state.catGroup.visible = true;
    state.burstT = -1;
    state.particleMaterial.opacity = 0;

    document.body.style.cursor = '';

    setLoading(false);
    setLoadingPercent(0);
    setPopupOpen(false);
    setRunnerGameOpen(false);
    setRingPopupOpen(false);
    setLandedUI(false);
  };


  useEffect(() => {
    const preloadStore = preloadStoreRef.current;
    let cancelled = false;

    THREE.Cache.enabled = true;

    // Start the two models needed for first paint immediately.
    Promise.allSettled(
      CORE_MODEL_PRELOAD_URLS.map((url) => preloadGLB(preloadStore, url)),
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `Could not preload core model ${CORE_MODEL_PRELOAD_URLS[index]}:`,
            result.reason,
          );
        }
      });

      if (!cancelled) {
        setCoreModelsReady(true);
      }
    });

    // Warm the rest of /public in idle time so the intro stays smooth.
    const cancelIdleWork = runSoonWhenIdle(() => {
      ALL_PUBLIC_GLB_PRELOAD_URLS
        .filter((url) => !CORE_MODEL_PRELOAD_URLS.includes(url))
        .forEach((url) => {
          preloadGLB(preloadStore, url).catch((error) => {
            console.warn(`Optional model preload skipped ${url}:`, error);
          });
        });

      PUBLIC_IMAGE_PRELOAD_URLS.forEach((url) => {
        preloadTexture(preloadStore, url).catch(() => null);
      });
    });

    return () => {
      cancelled = true;
      cancelIdleWork?.();
    };
  }, []);

  useEffect(() => {
    if (!introFinished) return;
    setMovingBgSymbols(createMovingBackgroundSymbols());
  }, [introFinished]);

  useEffect(() => {
    if (!introFinished) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let width = window.innerWidth;
    let height = window.innerHeight;

    THREE.Cache.enabled = true;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    scene.background = null;
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1200);
    camera.position.set(0, height > width ? 2.8 : 2.5, height > width ? 13.5 : 11);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xe9e4ff, 0xffe8f5, 2.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(4, 8, 7);
    keyLight.castShadow = false;
    scene.add(keyLight);

    const blueFill = new THREE.PointLight(0xaedbff, 2.2, 30);
    blueFill.position.set(-5, 2, 5);
    scene.add(blueFill);

    const pinkFill = new THREE.PointLight(0xffb7dc, 1.8, 20);
    pinkFill.position.set(5, 3, 3);
    scene.add(pinkFill);

    // Star field
    const starCount = width < 768 ? 450 : 900;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i += 1) {
      const u = Math.random();
      const v = Math.random();
      const theta = Math.PI * 2 * u;
      const phi = Math.acos(2 * v - 1);
      const radius = 60 + Math.random() * 30;

      starPositions[i * 3] =
        radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] =
        radius * Math.cos(phi);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3),
    );

    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xb7c8ff,
        size: 0.3,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    // Infinity triangle water is drawn first, like z-index: -100000.
    // Old opaque waves, boat and cat render on top of it.
    const infinityTriangleWater = createInfinityTriangleWater();
    scene.add(infinityTriangleWater);

const pinkWireframeGlobe = createPinkWireframeGlobe();
scene.add(pinkWireframeGlobe);
      
    // Smooth pastel water: no GLB and no textures, but enough geometry for real waves.
    // This avoids the hard texture cuts caused by separate flat highlight planes.
    const pastelWater = createUltraFastWater();
    scene.add(pastelWater.group);

    // Optional water texture for both the old/front water and the infinity triangle.
    // Missing file = no texture added, so both waters stay exactly like before.
    const waterTextureLoader = new THREE.TextureLoader();

    waterTextureLoader.load(
      '/images/water-texture.jpg?v=1',
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        // Add texture to the old/front water only after the image exists.
        if (pastelWater?.water?.material) {
          pastelWater.water.material.map = texture;
          pastelWater.water.material.roughness = 0.12;
          pastelWater.water.material.needsUpdate = true;
        }

        // Add texture to the new/infinity triangle only after the image exists.
        if (infinityTriangleWater?.material?.uniforms) {
          infinityTriangleWater.material.uniforms.uWaterTexture.value = texture;
          infinityTriangleWater.material.uniforms.uTextureStrength.value = 0.22;
        }
      },
      undefined,
      (error) => {
        console.warn(
          'No /images/water-texture.jpg found. Water stays original without texture.',
          error,
        );
      },
    );

    // These groups preserve all of the original motion and drag behaviour.
    // The GLB scenes are inserted inside them after loading.
    const boatGroup = new THREE.Group();
    boatGroup.position.z = BOAT_DEPTH;
    scene.add(boatGroup);

    const catGroup = new THREE.Group();
    catGroup.position.copy(START);
    scene.add(catGroup);

    const floatRingGroup = new THREE.Group();
    floatRingGroup.name = 'ClickableFloatingRing';
    floatRingGroup.position.copy(FLOAT_RING_POSITION);
    scene.add(floatRingGroup);

    const seatPosition = DEFAULT_SEAT.clone();
    const mixers = [];

    const dropZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0xaedbff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const dropZoneRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.38, 128),
      dropZoneMaterial,
    );
    dropZoneRing.rotation.x = -Math.PI / 2;
    dropZoneRing.position.y = 0.15;
    boatGroup.add(dropZoneRing);

    const dropTargetMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
      side: THREE.DoubleSide,
    });

    const dropTarget = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 3.8, 6.4),
      dropTargetMaterial,
    );
    dropTarget.position.set(0, 0.8, 0);
    dropTarget.name = 'BoatDropTarget';
    boatGroup.add(dropTarget);

    const boatGlow = new THREE.PointLight(0xb8dfff, 2.4, 10);
    boatGlow.position.set(0, 0.45, 0);
    boatGroup.add(boatGlow);

    const catGlow = new THREE.PointLight(0xb8dfff, 2.8, 5);
    catGlow.position.set(0, 0.4, 0.5);
    catGroup.add(catGlow);

    const catPinkGlow = new THREE.PointLight(0xffb7dc, 2.0, 4);
    catPinkGlow.position.set(0, 0.9, 0);
    catGroup.add(catPinkGlow);

    const floatRingHitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
    });

    const floatRingHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 32, 16),
      floatRingHitMaterial,
    );
    floatRingHitbox.name = 'FloatingRingClickTarget';
    floatRingHitbox.userData.isFloatingRing = true;
    floatRingGroup.add(floatRingHitbox);

    const floatRingGlow = new THREE.PointLight(0xffd7f4, 1.8, 4.5);
    floatRingGlow.position.set(0, 0.28, 0);
    floatRingGroup.add(floatRingGlow);

    // Load the boat and cat from the intro preload cache when possible.
    // If the intro finished before a preload completed, this waits on the same Promise
    // instead of starting a duplicate network request.
    const preloadStore = preloadStoreRef.current;


    loadSceneGLTF(preloadStore, FLOAT_RING_MODEL_URL)
      .catch((primaryError) => {
        console.warn('Could not load /models/float-ring.glb, trying /models/floatring.glb:', primaryError);
        return loadSceneGLTF(preloadStore, FLOAT_RING_FALLBACK_MODEL_URL);
      })
      .then((ringGLTF) => {
        if (disposed) {
          disposeObject(ringGLTF.scene);
          return;
        }

        const floatRingModel = ringGLTF.scene;
        floatRingModel.name = 'FloatingRingModel';
        improveModelQuality(floatRingModel, renderer, [
          new THREE.Color(0xffb7dc),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xaedbff),
          new THREE.Color(0xffffff),
        ]);

        fitModel(
          floatRingModel,
          FLOAT_RING_TARGET_SIZE,
          -0.16,
          0,
          'max',
        );

        // If the ring appears upright in your exported GLB, change this constant to 0.
        floatRingModel.rotation.x = FLOAT_RING_MODEL_TILT_X;
        floatRingModel.rotation.z = 0.14;
        floatRingModel.traverse((object) => {
          object.userData.isFloatingRing = true;
        });

        floatRingGroup.add(floatRingModel);
      })
      .catch((error) => {
        console.warn('Floating ring model could not be loaded:', error);
      });

    Promise.all([
      loadSceneGLTF(preloadStore, BOAT_MODEL_URL),
      loadSceneGLTF(preloadStore, CAT_MODEL_URL),
    ])
      .then(([boatGLTF, catGLTF]) => {
        if (disposed) {
          disposeObject(boatGLTF.scene);
          disposeObject(catGLTF.scene);
          return;
        }

        const boatModel = boatGLTF.scene;
        boatModel.name = 'CosmicBoatModel';
        improveModelQuality(boatModel, renderer, [
          new THREE.Color(0xaedbff),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xffb7dc),
        ]);

        const boatBox = fitModel(
          boatModel,
          7.0,
          -0.65,
          BOAT_MODEL_ROTATION_Y,
          'horizontal',
        );

        boatGroup.add(boatModel);
        createMixer(boatModel, boatGLTF.animations, mixers);

        const boatSize = boatBox.getSize(new THREE.Vector3());

        // Optional exact marker:
        // Add an Empty named "CatSeat" inside cosmic-boat.glb to control
        // the final cat position precisely.
        const seatMarker =
          boatModel.getObjectByName('CatSeat') ||
          boatModel.getObjectByName('cat_seat') ||
          boatModel.getObjectByName('CAT_SEAT');

        if (seatMarker) {
          const markerWorld = seatMarker.getWorldPosition(new THREE.Vector3());
          seatPosition.copy(boatGroup.worldToLocal(markerWorld));
        } else {
          const estimatedDeckY = boatBox.min.y + boatSize.y * 0.25;

          seatPosition.set(
            -0.8,
            estimatedDeckY - CAT_GROUND_Y + 0.03,
            boatBox.max.z - boatSize.z * 0.38,
          );
        }

        dropZoneRing.position.y =
          seatPosition.y + CAT_GROUND_Y + 0.04;

        const catModel = catGLTF.scene;
        catModel.name = 'AlienCatModel';
        improveModelQuality(catModel, renderer, [
          new THREE.Color(0xffb7dc),
          new THREE.Color(0xcab8ff),
          new THREE.Color(0xaedbff),
        ]);

        const catBox = fitModel(
          catModel,
          2.35,
          CAT_GROUND_Y,
          CAT_MODEL_ROTATION_Y,
          'max',
        );

        catGroup.add(catModel);
        createMixer(catModel, catGLTF.animations, mixers);

        const catSize = catBox.getSize(new THREE.Vector3());
        const hitRadius =
          Math.max(catSize.x, catSize.y, catSize.z) * 0.7;

        const currentState = stateRef.current;
        if (currentState) {
          currentState.modelsReady = true;
          currentState.catHitRadius = Math.max(0.7, hitRadius);
        }
      })
      .catch((error) => {
        console.error('Cosmic Voyage model/setup error:', error);

        if (!disposed) {
          setModelError(
            `Model setup failed: ${error?.message || 'Unknown GLB/model error'}`,
          );
        }
      });

    // Celebration particles
    const particleCount = 50;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0xffb7dc),
      new THREE.Color(0xcab8ff),
      new THREE.Color(0xaedbff),
      new THREE.Color(0xf5c8ff),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < particleCount; i += 1) {
      const color = palette[i % palette.length];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(particleColors, 3),
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const burstPoints = new THREE.Points(
      particleGeometry,
      particleMaterial,
    );
    burstPoints.position.set(0, 0.8, 0.3);
    scene.add(burstPoints);

    const raycaster = new THREE.Raycaster();
    const dragPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -DRAG_Z,
    );
    const pointerNDC = new THREE.Vector2();
    const temporaryWorldPosition = new THREE.Vector3();

    const currentPosition = START.clone();
    const targetPosition = START.clone();

    const state = {
      landed: false,
      isDragging: false,
      hasDragged: false,
      dragDistancePx: 0,
      dragStartClient: new THREE.Vector2(),
      modelsReady: false,
      catHitRadius: 0.9,
      launching: false,
      launchComplete: false,
      launchElapsed: 0,
      cur: currentPosition,
      tgt: targetPosition,
      boatGroup,
      catGroup,
      floatRingGroup,
      particleMaterial,
      burstT: -1,
    };

    stateRef.current = state;

    const setPointerRay = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();

      pointerNDC.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(pointerNDC, camera);
    };

    const pointerToWorld = (clientX, clientY) => {
      setPointerRay(clientX, clientY);
      raycaster.ray.intersectPlane(
        dragPlane,
        temporaryWorldPosition,
      );
      return temporaryWorldPosition;
    };


    const tryOpenFloatingRing = (clientX, clientY) => {
      if (state.isDragging || state.launching) return false;

      setPointerRay(clientX, clientY);
      const ringIntersections = raycaster.intersectObject(floatRingGroup, true);

      if (ringIntersections.length > 0) {
        placeRingPopupFromPointer(clientX, clientY);
        setRingPopupOpen(true);
        document.body.style.cursor = '';
        return true;
      }

      return false;
    };

    const tryDrag = (clientX, clientY) => {
      if (state.landed || !state.modelsReady) return;

      setPointerRay(clientX, clientY);

      const modelIntersections = raycaster.intersectObject(
        catGroup,
        true,
      );

      const catWorldPosition = catGroup.getWorldPosition(
        new THREE.Vector3(),
      );

      const closeToCat =
        raycaster.ray.distanceToPoint(catWorldPosition) <
        state.catHitRadius;

      if (modelIntersections.length > 0 || closeToCat) {
        state.isDragging = true;
        state.hasDragged = false;
        state.dragDistancePx = 0;
        state.dragStartClient.set(clientX, clientY);
        document.body.style.cursor = 'grabbing';
      }
    };

    const moveDraggedCat = (clientX, clientY) => {
      if (!state.isDragging || state.landed) return;

      const deltaX = clientX - state.dragStartClient.x;
      const deltaY = clientY - state.dragStartClient.y;
      const distance = Math.hypot(deltaX, deltaY);

      state.dragDistancePx = Math.max(
        state.dragDistancePx,
        distance,
      );

      // This threshold prevents a tap or tiny finger wobble from
      // counting as a completed drag.
      if (state.dragDistancePx < 14) return;

      state.hasDragged = true;

      const worldPosition = pointerToWorld(clientX, clientY);

      if (worldPosition.lengthSq() > 0.001) {
        state.tgt.set(
          worldPosition.x,
          worldPosition.y,
          DRAG_Z,
        );
      }
    };

    const spawnBurst = () => {
      state.burstT = 0;
      const positions =
        particleGeometry.attributes.position.array;

      for (let i = 0; i < particleCount; i += 1) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;

        particleVelocities[i * 3] =
          Math.sin(phi) * Math.cos(theta) * speed;
        particleVelocities[i * 3 + 1] =
          Math.abs(Math.sin(phi) * Math.sin(theta) * speed) +
          0.5;
        particleVelocities[i * 3 + 2] =
          Math.cos(phi) * speed;
      }

      particleGeometry.attributes.position.needsUpdate = true;
    };

    const finishDrag = (clientX, clientY) => {
      if (!state.isDragging || state.landed) return;

      state.isDragging = false;
      document.body.style.cursor = '';

      // A press-and-release without meaningful movement is only a tap.
      if (!state.hasDragged) {
        state.tgt.copy(START);
        state.dragDistancePx = 0;
        return;
      }

      // The release point must actually be over the boat's invisible
      // 3D drop target. This keeps drop detection visually accurate
      // even though the boat is farther away in depth.
      setPointerRay(clientX, clientY);
      const releasedOverBoat =
        raycaster.intersectObject(dropTarget, false).length > 0;

      state.hasDragged = false;
      state.dragDistancePx = 0;

      if (releasedOverBoat) {
        state.landed = true;
        state.launching = true;
        state.launchComplete = false;
        state.launchElapsed = 0;

        boatGroup.updateMatrixWorld(true);
        state.tgt.copy(
          boatGroup.localToWorld(seatPosition.clone()),
        );

        // Keep the cat visible throughout the loading sequence.
        setLandedUI(true);
        setLoading(true);
        setLoadingPercent(0);
        spawnBurst();

        const startedAt = Date.now();

        const progressTimer = window.setInterval(() => {
          const nextPercent = Math.min(
            100,
            Math.round(
              ((Date.now() - startedAt) / 3000) * 100,
            ),
          );

          setLoadingPercent(nextPercent);

          if (nextPercent >= 100) {
            window.clearInterval(progressTimer);
          }
        }, 60);

        window.setTimeout(() => {
          window.clearInterval(progressTimer);

          state.launching = false;
          state.launchComplete = true;
          state.boatGroup.visible = false;
          state.catGroup.visible = false;

          setLoading(false);
          setLoadingPercent(100);
          setPopupOpen(true);
        }, LAUNCH_DURATION_SECONDS * 1000);
      } else {
        state.tgt.copy(START);
      }
    };

    const onMouseDown = (event) => {
      if (tryOpenFloatingRing(event.clientX, event.clientY)) return;
      tryDrag(event.clientX, event.clientY);
    };

    const onMouseMove = (event) => {
      moveDraggedCat(event.clientX, event.clientY);

      if (!state.isDragging && !state.landed && !state.launching) {
        setPointerRay(event.clientX, event.clientY);
        const hoveringRing = raycaster.intersectObject(floatRingGroup, true).length > 0;
        document.body.style.cursor = hoveringRing ? 'pointer' : '';
      }
    };

    const onMouseUp = (event) => {
      finishDrag(event.clientX, event.clientY);
    };

    const onTouchStart = (event) => {
      event.preventDefault();
      const touch = event.touches[0];

      if (touch) {
        if (tryOpenFloatingRing(touch.clientX, touch.clientY)) return;
        tryDrag(touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (event) => {
      if (state.isDragging) event.preventDefault();
      const touch = event.touches[0];

      if (touch) {
        moveDraggedCat(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = (event) => {
      const touch = event.changedTouches[0];

      if (touch) {
        finishDrag(touch.clientX, touch.clientY);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, {
      passive: false,
    });
    window.addEventListener('touchmove', onTouchMove, {
      passive: false,
    });
    window.addEventListener('touchend', onTouchEnd);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1.5),
      );
      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.position.set(
        0,
        height > width ? 2.8 : 2.5,
        height > width ? 13.5 : 11,
      );
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let elapsed = 0;

    const lerp = (from, to, amount) =>
      from + (to - from) * amount;

    const easeOutCubic = (value) =>
      1 - Math.pow(1 - value, 3);

    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;

pinkWireframeGlobe.rotation.y += delta * 0.42;
pinkWireframeGlobe.rotation.x =
  -0.18 + Math.sin(elapsed * 0.34) * 0.025;
pinkWireframeGlobe.rotation.z =
  0.08 + Math.cos(elapsed * 0.28) * 0.018;
      
      infinityTriangleWater.material.uniforms.uTime.value = elapsed;

      // Animate the optional water texture only if it successfully loaded.
      if (pastelWater?.water?.material?.map) {
        pastelWater.water.material.map.offset.x = elapsed * 0.015;
        pastelWater.water.material.map.offset.y = elapsed * 0.025;
      }


      // Match the boat's water bob exactly, then keep the ring sunk by FLOAT_RING_POSITION.y.
      const ringWaterBob =
        Math.sin(elapsed * 2.45) * 0.17 +
        Math.cos(elapsed * 1.65) * 0.08;
      floatRingGroup.position.set(
        FLOAT_RING_POSITION.x,
        FLOAT_RING_POSITION.y + ringWaterBob,
        FLOAT_RING_POSITION.z,
      );
      floatRingGroup.rotation.x = Math.cos(elapsed * 1.8) * 0.028;
      floatRingGroup.rotation.y = Math.sin(elapsed * 1.2) * 0.045;
      floatRingGroup.rotation.z = Math.sin(elapsed * 2.1) * 0.055;
      floatRingGlow.intensity = 1.55 + Math.sin(elapsed * 3.2) * 0.28;


      // Smooth high waves with animated vertex colors.
      // PlaneGeometry lies in local X/Y, so wave height is local Z after rotation.
      const colorAttr = pastelWater.water.geometry.attributes.color;

      for (let i = 0; i < pastelWater.waterPositions.count; i += 1) {
        const x = pastelWater.basePositions[i * 3];
        const y = pastelWater.basePositions[i * 3 + 1];

        const longWave =
          Math.sin(x * 0.18 + elapsed * 2.55) * 0.50;
        const crossWave =
          Math.cos(y * 0.16 + elapsed * 2.15) * 0.36;
        const diagonalWave =
          Math.sin((x + y) * 0.085 + elapsed * 3.2) * 0.22;
        const smallTide =
          Math.cos((x - y) * 0.12 + elapsed * 4.1) * 0.12;

        const height =
          longWave +
          crossWave +
          diagonalWave +
          smallTide;

        pastelWater.waterPositions.array[i * 3 + 2] = height;

        const crest = THREE.MathUtils.clamp(
          (height + 0.75) / 1.65,
          0,
          1,
        );

        const ribbonA =
          (Math.sin(x * 0.105 + elapsed * 0.9) + 1) * 0.5;
        const ribbonB =
          (Math.cos(y * 0.115 - elapsed * 0.7) + 1) * 0.5;
        const ribbonC =
          (Math.sin((x + y) * 0.06 + elapsed * 1.15) + 1) * 0.5;

        const c = new THREE.Color();

        c.copy(pastelWater.deepCyan)
          .lerp(pastelWater.cyan, crest * 0.65)
          .lerp(pastelWater.pink, ribbonA * 0.42)
          .lerp(pastelWater.lavender, ribbonB * 0.34)
          .lerp(pastelWater.softPink, ribbonC * 0.20)
          .lerp(pastelWater.whiteFoam, Math.max(0, crest - 0.72) * 0.75);

        colorAttr.array[i * 3] = c.r;
        colorAttr.array[i * 3 + 1] = c.g;
        colorAttr.array[i * 3 + 2] = c.b;
      }

      pastelWater.waterPositions.needsUpdate = true;
      colorAttr.needsUpdate = true;
      pastelWater.water.geometry.computeVertexNormals();
      pastelWater.water.rotation.z = Math.sin(elapsed * 0.8) * 0.006;

      if (state.launching) {
        state.launchElapsed = Math.min(
          LAUNCH_DURATION_SECONDS,
          state.launchElapsed + delta,
        );

        const launchProgress =
          state.launchElapsed / LAUNCH_DURATION_SECONDS;
        const easedLaunch = easeOutCubic(launchProgress);

        // Turn the boat around and send it far away while LOADING is shown.
        boatGroup.position.x =
          Math.sin(easedLaunch * Math.PI) * 1.6;
        boatGroup.position.y =
          BOAT_WATERLINE_Y +
          easedLaunch * LAUNCH_HEIGHT +
          Math.sin(elapsed * 8.0) * 0.08;
        boatGroup.position.z =
          BOAT_DEPTH - easedLaunch * LAUNCH_DISTANCE;

      // Keep the boat facing away during the whole flyaway.
// Math.PI turns it quarter degrees so the viewer sees the back.
boatGroup.rotation.y = -Math.PI / 2;
boatGroup.rotation.z = 0;
boatGroup.rotation.x = 0;
        
      } else if (!state.launchComplete) {
        boatGroup.position.x = 0;
        boatGroup.position.y =
          BOAT_WATERLINE_Y +
          Math.sin(elapsed * 2.45) * 0.17 +
          Math.cos(elapsed * 1.65) * 0.08;
        boatGroup.position.z = BOAT_DEPTH;

        boatGroup.rotation.y = 0;
        boatGroup.rotation.z = Math.sin(elapsed * 2.1) * 0.055;
        boatGroup.rotation.x = Math.cos(elapsed * 1.8) * 0.028;
      }

      mixers.forEach((mixer) => mixer.update(delta));

      const dragging = state.isDragging && !state.landed;
      dropZoneMaterial.opacity = lerp(
        dropZoneMaterial.opacity,
        dragging
          ? 0.5 + Math.sin(elapsed * 4) * 0.2
          : 0,
        Math.min(1, delta * 7),
      );

      const followSpeed = state.isDragging
        ? 13
        : state.landed
          ? 4
          : 7;

      const followAmount = Math.min(
        1,
        delta * followSpeed,
      );

      if (state.landed && !state.launchComplete) {
        // Convert the seat marker/local seat position into scene space
        // every frame so the cat follows the farther-away floating boat.
        boatGroup.updateMatrixWorld(true);
        state.tgt.copy(
          boatGroup.localToWorld(seatPosition.clone()),
        );
      }

      state.cur.x = lerp(
        state.cur.x,
        state.tgt.x,
        followAmount,
      );
      state.cur.y = lerp(
        state.cur.y,
        state.tgt.y,
        followAmount,
      );
      state.cur.z = lerp(
        state.cur.z,
        state.tgt.z,
        followAmount,
      );

      catGroup.position.copy(state.cur);

      if (!state.isDragging && !state.landed) {
  const jump = Math.abs(Math.sin(elapsed * 3.2));

  catGroup.position.y += jump * 0.38;
  catGroup.position.z += Math.sin(elapsed * 1.6) * 0.08;

  catGroup.rotation.y = 0;
  catGroup.rotation.z = Math.sin(elapsed * 6.4) * 0.08;
  catGroup.rotation.x = Math.sin(elapsed * 3.2) * -0.08;
} else if (state.isDragging) {
  catGroup.rotation.y = 0;
      }
if (state.landed) {
  const happyPulse = Math.max(
    0,
    Math.sin(elapsed * 8),
  );

  const CAT_ON_BOAT_OFFSET = new THREE.Vector3(0, 0.0, 0);
  const CAT_ON_BOAT_ROTATION = new THREE.Euler(-0.08, 0, 0);

  catGroup.position.add(CAT_ON_BOAT_OFFSET);
  catGroup.position.y += happyPulse * 0.09;

  catGroup.rotation.x = CAT_ON_BOAT_ROTATION.x;
  catGroup.rotation.y = CAT_ON_BOAT_ROTATION.y;
  catGroup.rotation.z =
    boatGroup.rotation.z + CAT_ON_BOAT_ROTATION.z;

  catGroup.scale.setScalar(1 + happyPulse * 0.035);
}
       else {
        catGroup.scale.setScalar(1);
      }

      if (state.burstT >= 0) {
        state.burstT += delta;

        const positions =
          particleGeometry.attributes.position.array;

        for (let i = 0; i < particleCount; i += 1) {
          positions[i * 3] +=
            particleVelocities[i * 3] * delta;
          positions[i * 3 + 1] +=
            particleVelocities[i * 3 + 1] * delta;
          positions[i * 3 + 2] +=
            particleVelocities[i * 3 + 2] * delta;

          particleVelocities[i * 3 + 1] -= delta * 1.6;
          particleVelocities[i * 3] *= 0.98;
          particleVelocities[i * 3 + 2] *= 0.98;
        }

        particleGeometry.attributes.position.needsUpdate =
          true;

        particleMaterial.opacity =
          state.burstT < 1.6
            ? Math.max(0, 1 - state.burstT / 1.6)
            : 0;

        if (state.burstT > 2) {
          state.burstT = -1;
        }
      }

      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);

      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);

      document.body.style.cursor = '';
      stateRef.current = null;

      mixers.forEach((mixer) => mixer.stopAllAction());
      disposeObject(scene);
      renderer.dispose();
    };
  }, [introFinished, placeRingPopupFromPointer]);

  const loadingBarStyle = useMemo(
    () => ({ width: `${loadingPercent}%` }),
    [loadingPercent],
  );

  return (
    <main className="stage">
      {!introFinished ? (
        <ShoppingIntroSplash
          onFinished={finishIntro}
          preloadStore={preloadStoreRef.current}
          coreModelsReady={coreModelsReady}
          selectedLanguageCode={selectedLanguageCode}
          onLanguageChange={setSelectedLanguageCode}
        />
      ) : (
        <div className="mainExperienceFadeIn">
          <div className="pastelBackgroundViewport" aria-hidden="true">
        <div className="pastelBackgroundMotion">
          <div className="spaceBg" />

          <div className="movingSymbolLayer">
            {movingBgSymbols.map((symbol) => (
              <img
                key={symbol.id}
                className="movingBgSymbol"
                src={symbol.src}
                alt=""
                style={{
                  '--x': `${symbol.x}%`,
                  '--y': `${symbol.y}%`,
                  '--size': `${symbol.size}px`,
                  '--opacity': symbol.opacity,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="canvas" />

      <div className="ui">

        <div className="logoContainer">
  <a
    href="https://www.almostmadeinjapan.com/home"
    className="logoLink"
    aria-label={copy.logoAlt}
  >
    <img
      src="/images/almostmadeinjapan.png"
      alt={copy.logoAlt}
      className="logoImage"
    />
  </a>
</div>

        <button
          type="button"
          className="shoppingIntroTranslateButton mainExperienceTranslateButton"
          aria-label={copy.translate}
          aria-expanded={showMainTranslateModal}
          onClick={() => setShowMainTranslateModal(true)}
          style={{
            position: 'fixed',
            top: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
            right: 'max(16px, calc(env(safe-area-inset-right) + 12px))',
            left: 'auto',
            bottom: 'auto',
            zIndex: 42,
            transform: 'none',
          }}
        >
          <img
            src="/images/translate-icon.png"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
        </button>


        {!landedUI && (
          <div className="hint">
           {copy.dragHint}
          </div>
        )}
      </div>

      {showMainTranslateModal && (
        <div
          className="shoppingIntroTranslateModalBackdrop mainExperienceTranslateModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label={formatCopy(copy.translateTo, { language: selectedMainTranslateLanguageName })}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowMainTranslateModal(false);
            }
          }}
        >
          <div className="shoppingIntroTranslateModalCard">
            <div className="shoppingIntroTranslateModalHeader">
              <span className="shoppingIntroTranslateModalTitle">
                {formatCopy(copy.translateTo, { language: selectedMainTranslateLanguageName })}
              </span>

              <button
                type="button"
                className="shoppingIntroTranslateModalClose"
                aria-label={copy.closeTranslatePopup}
                onClick={() => setShowMainTranslateModal(false)}
              >
                ×
              </button>
            </div>

            <div className="shoppingIntroTranslateLanguageOrbit" aria-label={copy.chooseTranslationLanguage}>
              {TRANSLATE_LANGUAGE_OPTIONS.map((language, index) => {
                const angle =
                  (index / TRANSLATE_LANGUAGE_OPTIONS.length) * Math.PI * 2 -
                  Math.PI / 2;

                return (
                  <button
                    key={language.code}
                    type="button"
                    className={`shoppingIntroTranslateFlagButton${
                      selectedLanguageCode === language.code ? ' isActive' : ''
                    }`}
                    style={{
                      left: `${50 + Math.cos(angle) * 39}%`,
                      top: `${50 + Math.sin(angle) * 39}%`,
                    }}
                    aria-label={formatCopy(copy.translateToLanguage, {
                      language: language.nativeName || language.name,
                    })}
                    aria-pressed={selectedLanguageCode === language.code}
                    onClick={() => setSelectedLanguageCode(language.code)}
                  >
                    <img
                      className="shoppingIntroTranslateFlagImage"
                      src={language.flag}
                      alt=""
                      aria-hidden="true"
                      draggable="false"
                    />
                    <span className="shoppingIntroTranslateFlagCode">{language.short}</span>
                  </button>
                );
              })}
            </div>

            <div ref={mainTranslateGlbStageRef} className="shoppingIntroTranslateGlbStage">
              <div className="shoppingIntroTranslateGlbLoading">
                {copy[mainTranslateGlbStatusKey] || copy.chooseLanguage}
              </div>
            </div>
          </div>
        </div>
      )}


{loading && (

  <div className="loadingOverlay">
    <div className="loadingNetworkTicker" aria-hidden="true">
      <span>{copy.loadingTicker}</span>
    </div>

    <div className="loadingPopup" role="status">
      <div className="loadingWindowBar">
        <span />
      </div>

      <div className="loadingTitle">{copy.loadingTitle}</div>

      <div className="loadingBarOuter">
        <div
          className="loadingBarInner"
          style={loadingBarStyle}
        />
      </div>

      <div className="loadingPercent">
        {loadingPercent}%
      </div>
    </div>
	)}

      {runnerGameOpen && (
        <CosmicRunnerGameOverlay
          modelPath={CAT_MODEL_URL}
          onClose={() => setRunnerGameOpen(false)}
        />
      )}
	          

	      {popupOpen && (
        <div className="popupWindow">
          <div className="popupWindow missionGalleryWindow">
              <div className="termHeader">
                  <span>{copy.collectionsTitle}</span>
                      <button type="button" onClick={resetExperience}>
                            •
                                </button>
                                  </div>

                                    <div className="missionGalleryIntro">
</div>

<button
  type="button"
  className="collectionMiniGlobeOverlay collectionMiniGlobeGameButton"
  aria-label="Start runner game"
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    setRunnerGameOpen(true);
  }}
  style={{
    border: 0,
    padding: 0,
    background: 'transparent',
    cursor: 'pointer',
    pointerEvents: 'auto',
    lineHeight: 0,
    WebkitTapHighlightColor: 'transparent',
  }}
>
  <CollectionMiniGlobe />
</button>

                                                    <div className="missionImageGrid">
                                                        {MISSION_LINK_IMAGES.map((item) => {
                                                          const collectionTitle =
                                                            copy.collectionNames?.[item.titleKey] || item.title;
                                                          const openCollectionLabel = formatCopy(copy.openCollection, {
                                                            title: collectionTitle,
                                                          });

                                                          return (
                                                            <a
                                                              key={item.title}
                                                              className="missionImageLink"
                                                              href={item.url}
                                                              target="_blank"
                                                              rel="noreferrer"
                                                              aria-label={openCollectionLabel}
                                                            >
                                                              <img
                                                                src={item.image}
                                                                alt={collectionTitle}
                                                                loading="lazy"
                                                              />
                                                              <span>{collectionTitle}</span>
                                                            </a>
                                                          );
                                                        })}
                                                                                                                                                                                      </div>
                                                                                                                                                                                      </div>
        </div>
      )}


      {ringPopupOpen && (
        <div
          className="ringChatOverlay"
          role="presentation"
          onPointerDown={closeRingPopup}
        >
          <div className="ringChatBubbleLayer" aria-hidden="true">
            {RING_CHAT_BUBBLES.map((bubble, index) => (
              <span
                key={`ring-bubble-${index}`}
                className="ringChatBubble"
                style={{
                  '--bubble-x': `${bubble.x}%`,
                  '--bubble-y': `${bubble.y}%`,
                  '--bubble-size': `${bubble.size}px`,
                  '--bubble-delay': `${bubble.delay}s`,
                  '--bubble-speed': `${bubble.speed}s`,
                }}
              />
            ))}
          </div>

          <div
            className="ringChatBox"
            role="dialog"
            aria-modal="true"
            aria-label="Floating ring message"
            style={{
              '--ring-chat-left': `${ringPopupPlacement.left}px`,
              '--ring-chat-top': `${ringPopupPlacement.top}px`,
              '--ring-chat-arrow-left': `${ringPopupPlacement.arrowLeft}px`,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
    

            <pre ref={ringTerminalRef} className="ringTerminalText">

              <span className="ringTerminalImageLine">
    <img
      className="ringTerminalTopImage"
      src="/images/ascii-logo.png"
      alt=""
      aria-hidden="true"
    />
  </span>
              
              {ringTerminalText}
              <span className="ringTerminalCursor">▌</span>
            </pre>

<div className="ringSocialBar" aria-label="Social links">
  <a
    className="ringSocialButton ringSocialButtonTikTok"
    href="https://www.tiktok.com/@almostmadeinjapan"
    target="_blank"
    rel="noreferrer"
    aria-label="TikTok"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15.9 3.2c.3 2.4 1.6 3.9 4 4.1v3.2c-1.4.1-2.6-.3-3.9-1.1v5.8c0 3.7-2.4 5.9-5.6 5.9-3 0-5.3-2.1-5.3-5 0-3.2 2.6-5.4 6-5.1v3.4c-1.6-.5-2.8.3-2.8 1.6 0 1.1.9 1.9 2 1.9 1.3 0 2.1-.8 2.1-2.7v-12h3.5Z" />
    </svg>
  </a>

  <a
    className="ringSocialButton ringSocialButtonInstagram"
    href="https://www.instagram.com/almostmadeinjapan/"
    target="_blank"
    rel="noreferrer"
    aria-label="Instagram"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.6 2.7h8.8c2.7 0 4.9 2.2 4.9 4.9v8.8c0 2.7-2.2 4.9-4.9 4.9H7.6c-2.7 0-4.9-2.2-4.9-4.9V7.6c0-2.7 2.2-4.9 4.9-4.9Zm0 3c-1.1 0-1.9.8-1.9 1.9v8.8c0 1.1.8 1.9 1.9 1.9h8.8c1.1 0 1.9-.8 1.9-1.9V7.6c0-1.1-.8-1.9-1.9-1.9H7.6Zm4.4 3.1a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2.2a1 1 0 1 0 0 2.1 1 1 0 0 0 0-2.1Zm4.2-2.7a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
    </svg>
  </a>

  <a
    className="ringSocialButton ringSocialButtonEmail"
    href="mailto:almostmadeinjapan@gmail.com?subject=Almost Made in Japan&body=https://www.almostmadeinjapan.com/"
    aria-label="Email"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.8 5h16.4c1 0 1.8.8 1.8 1.8v10.4c0 1-.8 1.8-1.8 1.8H3.8c-1 0-1.8-.8-1.8-1.8V6.8C2 5.8 2.8 5 3.8 5Zm.9 3.4v7.9h14.6V8.4l-7.3 5-7.3-5Zm1.1-1.4 6.2 4.2L18.2 7H5.8Z" />
    </svg>
  </a>

  <button
    type="button"
    className="ringSocialButton ringSocialButtonShare"
    aria-label="Share"
    onClick={shareWebsite}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 16.1c-1 0-1.9.4-2.5 1.1L8.9 13.3c.1-.4.1-.8 0-1.2l6.5-3.8A3.3 3.3 0 1 0 14.3 6l-6.5 3.8a3.3 3.3 0 1 0 0 5.8l6.6 3.9A3.3 3.3 0 1 0 18 16.1Z" />
    </svg>
  </button>
</div>
            
          </div>
        </div>
      )}

          {modelError && (
            <div className="popupWindow">
          <div className="termHeader">
            <span>{copy.modelLoadError}</span>
            <button
              type="button"
              onClick={() => setModelError('')}
            >
              {copy.close}
            </button>
          </div>

          <div className="termText">
            {modelError}
            <br />
            <br />
            {copy.modelErrorBody1}
            <br />
            {copy.modelErrorBody2}
          </div>
        </div>
          )}
        </div>
      )}
    </main>
  );
}
