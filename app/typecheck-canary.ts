export function canary(value: string | undefined): number {
  return value?.length ?? 0
}
