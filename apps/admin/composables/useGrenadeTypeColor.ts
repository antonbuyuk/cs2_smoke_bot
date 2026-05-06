export function useGrenadeTypeColor() {
  function getTypeColorVar(typeName: string): string {
    const t = (typeName || '').toLowerCase();
    if (t.includes('smoke')) return '--gt-smoke';
    if (t.includes('flash')) return '--gt-flash';
    if (t.includes('he') || t.includes('frag') || t.includes('explos')) return '--gt-he';
    if (t.includes('molotov') || t.includes('incendiary') || t.includes('fire')) return '--gt-molo';
    if (t.includes('decoy')) return '--gt-decoy';
    return '--gt-smoke';
  }
  return { getTypeColorVar };
}
