// Shared mutable state accessed by multiple modules
export let currentArticleId = null
export function setCurrentArticleId(id) { currentArticleId = id }
