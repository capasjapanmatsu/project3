// Vite プラグインの型宣言

import type { Plugin } from 'vite';

declare module 'vite-plugin-webp' {
  interface WebpOptions {
    quality?: number;
    method?: number;
    autoFilter?: boolean;
    near_lossless?: number;
    size?: number;
  }
  
  function webp(options?: WebpOptions): Plugin;
  export default webp;
}

declare module 'vite-plugin-imagemin' {
  interface ImageminOptions {
    gifsicle?: {
      optimizationLevel?: number;
      interlaced?: boolean;
    };
    mozjpeg?: {
      quality?: number;
      progressive?: boolean;
    };
    pngquant?: {
      quality?: [number, number];
      speed?: number;
    };
    svgo?: {
      plugins?: Array<{
        name: string;
        active?: boolean;
      }>;
    };
  }
  
  function viteImagemin(options?: ImageminOptions): Plugin;
  export default viteImagemin;
}

declare module '@fullhuman/postcss-purgecss' {
  import type { PluginCreator } from 'postcss';
  
  interface PurgeCSSOptions {
    content?: string[];
    css?: string[];
    extractors?: Array<{
      extractor: (content: string) => string[];
      extensions: string[];
    }>;
    safelist?: (string | RegExp)[];
    blocklist?: (string | RegExp)[];
  }
  
  const purgecss: PluginCreator<PurgeCSSOptions>;
  export default purgecss;
}

declare module 'postcss-import' {
  import type { PluginCreator } from 'postcss';
  
  interface PostcssImportOptions {
    resolve?: (id: string, basedir: string) => string | Promise<string>;
    load?: (filename: string) => string | Promise<string>;
    plugins?: unknown[];
  }
  
  const postcssImport: PluginCreator<PostcssImportOptions>;
  export default postcssImport;
}

declare module 'postcss-url' {
  import type { PluginCreator } from 'postcss';
  
  interface PostcssUrlOptions {
    url?: string;
    maxSize?: number;
    fallback?: string;
  }
  
  const postcssUrl: PluginCreator<PostcssUrlOptions>;
  export default postcssUrl;
}

declare module 'postcss-preset-env' {
  import type { PluginCreator } from 'postcss';
  
  interface PostcssPresetEnvOptions {
    stage?: number;
    features?: {
      [key: string]: boolean;
    };
  }
  
  const postcssPresetEnv: PluginCreator<PostcssPresetEnvOptions>;
  export default postcssPresetEnv;
}

declare module 'cssnano' {
  import type { PluginCreator } from 'postcss';
  
  interface CssnanoOptions {
    preset?: [string, Record<string, unknown>] | string;
  }
  
  const cssnano: PluginCreator<CssnanoOptions>;
  export default cssnano;
}
