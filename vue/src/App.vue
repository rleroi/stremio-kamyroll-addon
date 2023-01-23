<template>
    <div class="antialiased p-4 sm:p-12 bg-purple-900 min-h-screen flex flex-col justify-center">
        <div class="sm:flex justify-center bg-gray-900 p-5 sm:p-12 rounded-3xl shadow-xl">

            <div class="flex-col flex self-center lg:p-10 sm:max-w-5xl xl:max-w-lg">
                <div class="flex-col text-white">
                    <h3>
                        <img src="/stremio.png" alt="Stremio">
                    </h3>
                    <h1 class="my-3 font-semibold text-4xl">Rab1t's Addons</h1>
                    <p class="pr-3 text-sm opacity-75">Please donate to keep this addon alive.</p>

                    <img class="my-8 w-full rounded-3xl" style="max-width: 265px;" src="/logo.png" />

                    <v-button class="mb-3 py-2" @click="openUrl('https://ko-fi.com/rab1t')">
                        <img class="w-8 mr-2" src="https://storage.ko-fi.com/cdn/brandasset/kofi_s_logo_nolabel.png" />
                        <span>Support me on Ko-fi</span>
                    </v-button>

                    <v-button @click="installAddon" class="" variation="primary">Install addon</v-button>
                </div>
            </div>

            <div class="ml-32 hidden lg:flex flex-col justify-center self-center">
                <iframe class="mx-auto rounded-3xl w-96 bg-purple-900" id='kofiframe' src='https://ko-fi.com/rab1t/?hidefeed=true&widget=true&embed=true&preview=true' height='712' title='rab1t'></iframe>
                <div class="mt-4 text-center text-gray-400 text-xs">
                    <a href="https://github.com/rleroi" rel="noopener" target="_blank" title="rab1t's GitHub"
                        class="mr-2 fill-gray-400 hover:fill-gray-500 ">
                        <svg class="inline-block" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                    <a href="https://ko-fi.com/rab1t" rel="noopener" target="_blank" title="Support me on Ko-fi">
                        <img class="inline-block" width="48px" src="https://storage.ko-fi.com/cdn/brandasset/kofi_s_logo_nolabel.png" />
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {onMounted, reactive} from 'vue';
import VButton from "./components/VButton.vue";
//import VInput from "./components/VInput.vue";

const state = reactive({
    addonUrl: `${import.meta.env.VITE_APP_URL}/manifest.json`,
});

function openUrl(url) {
    window.open(url);
}

function installAddon() {
    window.location.href = state.addonUrl.replace(/https?:\/\//, 'stremio://');
}
</script>
