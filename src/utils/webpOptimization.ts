import { readdir, stat } from 'fs/promises';
import { basename, extname, join } from 'path';
import sharp from 'sharp';

interface WebPOptions {
  quality?: number;
  effort?: number;
  lossless?: boolean;
}

interface ImageOptimizationResult {
  originalPath: string;
  webpPath: string;
  originalSize: number;
  webpSize: number;
  savings: number;
}

/**
 * 画像ファイルをWebP形式に変換
 */
export async function convertToWebP(
  inputPath: string,
  outputPath: string,
  options: WebPOptions = {}
): Promise<ImageOptimizationResult> {
  const {
    quality = 80,
    effort = 6,
    lossless = false
  } = options;

  try {
    // 元ファイルサイズを取得
    const originalStats = await stat(inputPath);
    const originalSize = originalStats.size;

    // WebP変換
    await sharp(inputPath)
      .webp({
        quality: lossless ? undefined : quality,
        effort,
        lossless,
        nearLossless: lossless ? false : undefined,
      })
      .toFile(outputPath);

    // 変換後ファイルサイズを取得
    const webpStats = await stat(outputPath);
    const webpSize = webpStats.size;

    const savings = ((originalSize - webpSize) / originalSize) * 100;

    return {
      originalPath: inputPath,
      webpPath: outputPath,
      originalSize,
      webpSize,
      savings
    };
  } catch (error) {
    console.error(`WebP conversion failed for ${inputPath}:`, error);
    throw error;
  }
}

/**
 * 指定ディレクトリ内の画像を再帰的に検索してWebP変換
 */
export async function processImagesInDirectory(
  inputDir: string,
  outputDir: string,
  options: WebPOptions = {}
): Promise<ImageOptimizationResult[]> {
  const results: ImageOptimizationResult[] = [];
  const supportedExtensions = ['.jpg', '.jpeg', '.png'];

  async function processDirectory(dir: string, relativeDir: string = '') {
    const items = await readdir(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const relativePath = join(relativeDir, item);
      const itemStat = await stat(fullPath);

      if (itemStat.isDirectory()) {
        // ディレクトリの場合は再帰処理
        await processDirectory(fullPath, relativePath);
      } else if (itemStat.isFile()) {
        const ext = extname(item).toLowerCase();
        
        if (supportedExtensions.includes(ext)) {
          const baseName = basename(item, ext);
          const outputPath = join(outputDir, relativeDir, `${baseName}.webp`);
          
          try {
            const result = await convertToWebP(fullPath, outputPath, options);
            results.push(result);
            
            console.warn(
              `✅ ${relativePath} → ${baseName}.webp (${result.savings.toFixed(1)}% smaller)`
            );
          } catch (error) {
            console.warn(`⚠️  Failed to convert ${relativePath}:`, error);
          }
        }
      }
    }
  }

  await processDirectory(inputDir);
  return results;
}

/**
 * 画像最適化サマリーを表示
 */
export function displayOptimizationSummary(results: ImageOptimizationResult[]) {
  if (results.length === 0) {
    return;
  }

  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalWebpSize = results.reduce((sum, r) => sum + r.webpSize, 0);
  const totalSavings = ((totalOriginalSize - totalWebpSize) / totalOriginalSize) * 100;

/**
 * バイト数を人間が読みやすい形式に変換
 */
function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(1)} ${sizes[i]}`;
}

/**
 * Viteプラグイン: WebP生成
 */
export function viteWebpPlugin(options: WebPOptions = {}) {
  return {
    name: 'vite-webp-generator',
    generateBundle: {
      order: 'post',
      async handler(_opts: unknown, _bundle: unknown) {
        if (process.env.NODE_ENV === 'production') {
          const publicDir = 'public';
          const outputDir = 'dist';
          
          try {
            const results = await processImagesInDirectory(
              publicDir,
              outputDir,
              options
            );
            
            displayOptimizationSummary(results);
          } catch (error) {
            console.warn('WebP generation failed:', error);
          }
        }
      }
    }
  };
}
