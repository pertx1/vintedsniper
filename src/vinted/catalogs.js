'use strict';

/**
 * Small table of Vinted catalog IDs for the manual monitor form.
 *
 * The IDs are the same on every Vinted domain. They were taken from catalog URLs
 * (".../catalog/1242-..."); if Vinted reorganizes its categories, update them here
 * or, better, create the monitor by pasting a URL.
 */

const CATALOGS = {
  sneakers: {
    label: 'Zapatillas',
    genders: {
      men: { label: 'Hombre', root: 1242, subcategories: {} },
      women: { label: 'Mujer', root: 2632, subcategories: {} },
    },
  },
  shoes: {
    label: 'Calzado (todo)',
    genders: {
      men: { label: 'Hombre', root: 1231, subcategories: {} },
      women: { label: 'Mujer', root: 16, subcategories: {} },
    },
  },
  clothing: {
    label: 'Ropa',
    genders: {
      men: {
        label: 'Hombre',
        root: 2050,
        subcategories: {
          outerwear: { label: 'Abrigos y chaquetas', id: 1206 },
          tops: { label: 'Camisetas y tops', id: 76 },
          jumpers: { label: 'Sudaderas y jerséis', id: 79 },
          jeans: { label: 'Vaqueros', id: 257 },
          trousers: { label: 'Pantalones', id: 34 },
          shorts: { label: 'Pantalones cortos', id: 80 },
        },
      },
      women: {
        label: 'Mujer',
        root: 4,
        subcategories: {
          outerwear: { label: 'Abrigos y chaquetas', id: 1037 },
          tops: { label: 'Camisetas y tops', id: 12 },
          jumpers: { label: 'Sudaderas y jerséis', id: 13 },
          dresses: { label: 'Vestidos', id: 10 },
          skirts: { label: 'Faldas', id: 11 },
          jeans: { label: 'Vaqueros', id: 183 },
          trousers: { label: 'Pantalones', id: 9 },
        },
      },
    },
  },
};

// Vinted item condition ("status") IDs.
const CONDITIONS = [
  { id: 6, label: 'Nuevo con etiquetas' },
  { id: 1, label: 'Nuevo sin etiquetas' },
  { id: 2, label: 'Muy bueno' },
  { id: 3, label: 'Bueno' },
  { id: 4, label: 'Satisfactorio' },
];

/**
 * Resolves kind/gender/subcategory into catalog IDs.
 * No gender -> both genders' categories.
 */
function resolveCatalogIds(kind, gender, subcategory) {
  const entry = CATALOGS[kind];
  if (!entry) return [];
  const genders = gender && entry.genders[gender] ? [gender] : Object.keys(entry.genders);
  const ids = [];
  for (const g of genders) {
    const def = entry.genders[g];
    const sub = subcategory && def.subcategories[subcategory];
    ids.push(sub ? sub.id : def.root);
  }
  return ids;
}

module.exports = { CATALOGS, CONDITIONS, resolveCatalogIds };
