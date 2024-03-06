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
      item.image = new Image()
      item.image.style.height = item.height
      item.image.style.width = item.width
      item.image.src = item.src
      this.ctx.globalAlpha = item.opacity
      this.ctx.drawImage(item.image, item.x, item.y, item.width, item.height)
    })
    this.move()
  }

  initialize() {
    if (!this?.canvas?.getContext) {
      return
    }
    this.setCanvasSize()
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
