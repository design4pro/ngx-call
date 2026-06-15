# ngx-call

Angular workspace for `ngx-call`, an awaitable UI call helper for Angular components.

The `demo` app is a static landing page and live playground for the library.

## Development server

To start a local development server, run:

```bash
npm start -- --project demo
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Demo build

Build the production demo:

```bash
npx ng build demo --configuration production
```

The static output is written to `dist/demo/browser`.

For GitHub Pages, build with the repository base path:

```bash
npx ng build demo --configuration production --base-href "/<repository-name>/"
```

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. To publish:

1. In GitHub, set **Settings → Pages → Source** to **GitHub Actions**.
2. Push to `main` or run the workflow manually.
3. The workflow installs dependencies, builds `demo`, uploads `dist/demo/browser`, and deploys it to Pages.

## Library build

To build the package library run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
