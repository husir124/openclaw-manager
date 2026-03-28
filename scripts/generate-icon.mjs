/**
 * 生成 OpenClaw Manager 应用图标
 *
 * 设计：深蓝底色 + 白色圆角矩形 + 橙色 "OC" 文字
 * 生成 1024x1024 PNG，然后用 Tauri 转换为 ICO
 */
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync } from 'fs'

const SIZE = 1024
const canvas = createCanvas(SIZE, SIZE)
const ctx = canvas.getContext('2d')

// 背景：深蓝渐变
const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE)
gradient.addColorStop(0, '#1a1a2e')
gradient.addColorStop(1, '#16213e')
ctx.fillStyle = gradient
ctx.beginPath()
ctx.roundRect(0, 0, SIZE, SIZE, SIZE * 0.18)
ctx.fill()

// 内部圆角矩形（浅色装饰框）
ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
ctx.lineWidth = 8
ctx.beginPath()
ctx.roundRect(60, 60, SIZE - 120, SIZE - 120, SIZE * 0.12)
ctx.stroke()

// 主文字 "OC"
ctx.fillStyle = '#ffffff'
ctx.font = 'bold 420px sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('OC', SIZE / 2, SIZE / 2 - 20)

// 副标题 "MANAGER"
ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
ctx.font = 'bold 100px sans-serif'
ctx.letterSpacing = '20px'
ctx.fillText('MANAGER', SIZE / 2, SIZE / 2 + 250)

// 底部装饰线
ctx.strokeStyle = '#e94560'
ctx.lineWidth = 12
ctx.beginPath()
ctx.moveTo(200, SIZE - 150)
ctx.lineTo(SIZE - 200, SIZE - 150)
ctx.stroke()

// 导出 PNG
const pngBuffer = canvas.toBuffer('image/png')
writeFileSync('src-tauri/icons/icon.png', pngBuffer)
console.log(`Generated icon.png (${pngBuffer.length} bytes)`)

// 导出多种尺寸（Tauri 需要）
const sizes = [32, 128, 256, 512]
for (const s of sizes) {
  const smallCanvas = createCanvas(s, s)
  const smallCtx = smallCanvas.getContext('2d')
  smallCtx.drawImage(canvas, 0, 0, s, s)
  const buf = smallCanvas.toBuffer('image/png')
  writeFileSync(`src-tauri/icons/${s}x${s}.png`, buf)
  console.log(`Generated ${s}x${s}.png (${buf.length} bytes)`)
}

console.log('Done! Run "pnpm tauri icon src-tauri/icons/icon.png" to generate all formats.')
