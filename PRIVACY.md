# Privacy

`dsh-translate` is a local DeepSeek Harness plugin with one display-layer function.

- **What leaves the browser:** only prose whose protected spans (code, paths, commands, URLs, identifiers, versions, hashes, numbers, product names) have been replaced by `⟦n⟧` placeholders — and only to the model provider configured in your own DSH profile.
- **What does not leave:** the plugin sends no telemetry, analytics, advertising or usage data to PerryLink. It has no hosted service and no account.
- **What is stored:** the original text nodes stay in page memory for the restore action; translated strings are cached in browser `localStorage` under `dsh-translate:cache:v1` (600 entries max) so a re-render does not call the model again. Clearing site data removes the cache.
- **What is never written:** the session log, workspace files, and the DSH configuration. The transcript always keeps exactly what the model said.
- **Credentials:** the plugin never reads, stores or forwards an API key. Authentication stays with the host provider configuration.
- **Removing the package** removes its code; it does not delete host logs or files you created.

This statement covers the npm package, not the DSH host or any other plugin in the profile.
