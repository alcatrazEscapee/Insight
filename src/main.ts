import { getElementById } from './utils';
import { IOption } from './options';
import { WebEngine } from './web-engine';

window.addEventListener('load', () => {

    (window as any).engine = new WebEngine();

    getElementById('upload-file', HTMLInputElement).addEventListener('change', event => {
        if (event.target !== null) {
            const file: Blob = ((event.target as any).files as Blob[])[0] as Blob;
            const reader = new FileReader();

            reader.onload = fileEvent => {
                WebEngine.instance().load(fileEvent.target?.result as string);
            };
            reader.readAsText(file);
        }
    });

    setupCheckbox('timestamps');
    setupCheckbox('source');
    setupCheckbox('level');

    setupCheckbox('debug');
    setupCheckbox('info');
    setupCheckbox('warn');
    setupCheckbox('error');

    setupCheckbox('stacktrace');
});

function setupCheckbox(key: IOption): void {
    const checkbox = getElementById(`checkbox-${key}`, HTMLInputElement);
    checkbox.addEventListener('change', () => {
        WebEngine.instance().set(key, checkbox.checked);
    });
}
