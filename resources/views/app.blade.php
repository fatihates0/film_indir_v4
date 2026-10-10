<!DOCTYPE html>
<html lang="en" class="dark">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>SineKutu - Premium Movie & Series Streaming</title>
  <script>
    (function () {
      try {
        var savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.classList.remove('light');
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } catch (e) { }
    })();
  </script>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="shortcut icon" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap"
    rel="stylesheet">
  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.jsx'])
  @inertiaHead
</head>

<body
  class="bg-[#f4f5f8] dark:bg-[#07080c] text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-[#00B074] selection:text-white min-h-screen transition-colors duration-300">
  @inertia
</body>

</html>