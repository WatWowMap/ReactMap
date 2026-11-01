// @ts-check
export class HolidayAnimations {
  /**
   * @param {string[]} images
   * @param {number} scale
   */
  constructor(images, scale = 1) {
    this.imageHeight = 15 * scale
    this.imageWidth = 15 * scale
    this.baseImages = images
    this.images = []
    /** @type {Map<string, HTMLImageElement>} */
    this.loaded = new Map()
    this.minScale = 0.3
    this.interval = null
    this.canvas = /** @type {HTMLCanvasElement} */ (
      document.getElementById('holiday-canvas')
    )
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null
  }

  setCanvasSize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.w = this.canvas.width
    this.h = this.canvas.height
  }

  move() {
    this.images.forEach((item) => {
      item.y += item.ys
      item.x += item.x > this.h / 2 ? item.xs : -item.xs
      if (item.y > this.h) {
        item.x = Math.random() * this.w
        item.y = -1 * this.imageHeight
      }
    })
  }

  draw() {
    this.setCanvasSize()
    this.ctx.clearRect(0, 0, this.w, this.h)
    this.images.forEach((item) => {
      const image = this.loaded.get(item.src)
      if (!image.complete || !image.naturalWidth) return
      this.ctx.globalAlpha = item.opacity
      this.ctx.drawImage(image, item.x, item.y, item.width, item.height)
    })
    this.move()
  }

  initialize() {
    if (!this?.canvas?.getContext) {
      return
    }
    this.setCanvasSize()
    // Load each source once; creating a new Image every frame re-requested
    // any URL that failed to load, every frame
    this.baseImages.forEach((src) => {
      if (this.loaded.has(src)) return
      const image = new Image()
      image.onerror = () => {
        // eslint-disable-next-line no-console
        console.warn('[HolidayEffect] failed to load image', src)
      }
      image.src = src
      this.loaded.set(src, image)
    })
    for (let a = 0; a < 30; a += 1) {
      const scale = Math.random() * (1 - this.minScale) + this.minScale
      this.images.push({
        x: Math.random() * this.w,
        xs: Math.random() * 2 - 1,
        y: Math.random() * this.h,
        ys: Math.random() + 1,
        height: scale * this.imageHeight,
        width: scale * this.imageWidth,
        opacity: Math.max(Math.random(), 0.25),
        src: this.baseImages[
          Math.floor(Math.random() * this.baseImages.length)
        ],
      })
    }
    this.interval = setInterval(this.draw.bind(this), 30)
  }

  stop() {
    this.images = []
    if (this.interval) clearInterval(this.interval)
    this.ctx.clearRect(0, 0, this.w, this.h)
  }
}
