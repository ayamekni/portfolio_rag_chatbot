export type Embedding = number[];

export function cosineSimilarity(a: Embedding, b: Embedding): number {
	const len = Math.min(a.length, b.length);
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < len; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	if (na === 0 || nb === 0) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topKByScore<T>(items: T[], score: (x: T) => number, k: number): T[] {
	return [...items]
		.map(item => ({ item, s: score(item) }))
		.sort((a, b) => b.s - a.s)
		.slice(0, Math.max(0, k))
		.map(x => x.item);
}


