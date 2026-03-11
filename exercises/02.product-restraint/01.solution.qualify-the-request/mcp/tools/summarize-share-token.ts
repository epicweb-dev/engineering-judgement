export function summarizeShareToken(token: string) {
	if (token.length <= 8) return token
	return `${token.slice(0, 4)}...${token.slice(-4)}`
}
