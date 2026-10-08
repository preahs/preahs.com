// Experiment: can a remark plugin rewrite /images/x -> relative src/assets path
// EARLY enough that Astro's own image optimisation still picks it up?
import { visit } from 'unist-util-visit';
import path from 'node:path';

export function remarkLocalImages() {
  return (tree, file) => {
    const fileDir = path.dirname(file.history[0] ?? file.path ?? '');
    const assetsDir = path.resolve('src/assets/images');
    visit(tree, 'image', (node) => {
      if (!node.url.startsWith('/images/')) return;
      const abs = path.join(assetsDir, node.url.slice('/images/'.length));
      let rel = path.relative(fileDir, abs);
      if (!rel.startsWith('.')) rel = './' + rel;
      node.url = rel;
    });
  };
}
