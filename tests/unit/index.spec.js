import ElectrificatorPlugin from 'src/index';
import ElectrificatorDrawer from 'src/draw/ElectrificatorDrawer';
import ElectrificatorMetadata from 'src/metadata/ElectrificatorMetadata';
import { ElectrificatorParser } from 'src/parser/ElectrificatorParser';
import ElectrificatorRenderer from 'src/render/ElectrificatorRenderer';

describe('Test index of project', () => {
  it('Index should return all needed objects', () => {
    expect(ElectrificatorPlugin).not.toBeNull();
    expect(ElectrificatorDrawer).not.toBeNull();
    expect(ElectrificatorMetadata).not.toBeNull();
    expect(ElectrificatorParser).not.toBeNull();
    expect(ElectrificatorRenderer).not.toBeNull();
  });
});
