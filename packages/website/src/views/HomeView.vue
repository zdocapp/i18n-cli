<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
</script>

<template>
  <main class="max-w-5xl mx-auto py-40">
    <div class="flex items-center gap-1 mb-5">
      <button class="btn" :class="{ 'btn-primary': locale === 'zh-CN' }" @click="locale = 'zh-CN'">
        简体中文
      </button>

      <button class="btn" :class="{ 'btn-primary': locale === 'zh-TW' }" @click="locale = 'zh-TW'">
        繁体中文
      </button>

      <button class="btn" :class="{ 'btn-primary': locale === 'en-US' }" @click="locale = 'en-US'">
        English
      </button>
    </div>

    <h1>{{ $t('welcome_message') }}</h1>

    <p>{{ $t('hello', { name: 'i18n-cli' }) }}</p>

    <p>{{ $t('hello2', { name: 'i18n-cli' }) }}</p>

    <p>{{ $t('hello3', ['hello']) }}</p>
  </main>
</template>
