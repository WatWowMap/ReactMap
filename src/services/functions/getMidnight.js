function getMidnight() {
  const date = new Date()
  return Math.floor(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      1,
      0,
    ).getTime() / 1000,
  )
}

export default getMidnight
