/**
 * 组件加载器 - 负责加载和管理页面组件
 */
export class ComponentLoader {
    constructor() {
        this.components = {};
        this.templates = {};
        this.basePath = '/components/';
    }

    /**
     * 注册组件
     * @param {string} name - 组件名称
     * @param {string} templatePath - 模板路径
     * @param {Function} callback - 回调函数
     */
    register(name, templatePath, callback) {
        this.components[name] = {
            template: templatePath,
            callback: callback
        };
    }

    /**
     * 加载组件模板
     * @param {string} name - 组件名称
     */
    async loadComponent(name) {
        const component = this.components[name];
        if (!component) {
            console.error(`组件 ${name} 未找到`);
            return;
        }

        try {
            const response = await fetch(this.basePath + component.template);
            const html = await response.text();
            this.templates[name] = html;

            // 插入到DOM
            const container = document.getElementById(`${name}-component`);
            if (container) {
                container.innerHTML = html;
            }

            // 执行回调
            if (component.callback) {
                component.callback();
            }
        } catch (error) {
            console.error(`加载组件 ${name} 失败:`, error);
        }
    }

    /**
     * 加载所有组件
     */
    async loadAllComponents() {
        const loadPromises = Object.keys(this.components).map(name =>
            this.loadComponent(name)
        );
        await Promise.all(loadPromises);
    }

    /**
     * 重新加载组件
     * @param {string} name - 组件名称
     */
    async reloadComponent(name) {
        delete this.templates[name];
        await this.loadComponent(name);
    }
}