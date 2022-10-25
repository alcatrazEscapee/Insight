import { getElementById } from './utils';
import { Engine } from './engine';
import { IOption } from './options';

window.addEventListener('load', () => {

    (window as any).engine = new Engine();

    getElementById('upload-file', HTMLInputElement).addEventListener('change', event => {
        if (event.target !== null) {
            const file: Blob = ((event.target as any).files as Blob[])[0] as Blob;
            const reader = new FileReader();

            reader.onload = fileEvent => {
                Engine.instance().load(fileEvent.target?.result as string);
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
        Engine.instance().set(key, checkbox.checked);
    });
}
