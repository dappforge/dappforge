declare module "*.svelte" {
    const Component: { new (options: any): any };
    export default Component;
  }