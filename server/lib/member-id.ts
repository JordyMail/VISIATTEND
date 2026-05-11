export function generateMemberId() {
    const suffix = `${Date.now()}`.slice(-6);
    return `MEM${suffix}`;
}