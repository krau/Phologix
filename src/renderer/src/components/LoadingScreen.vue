<template>
  <div class="flex items-center justify-center h-screen overflow-hidden fixed inset-0 w-full">
    <div class="p-8 text-center max-w-md mx-auto">
      <div class="flex justify-center mb-6">
        <img src="../assets/logo.png" alt="Phologix" class="h-24 w-auto animate-pulse" />
      </div>
      <div class="text-xl font-semibold mb-2">正在初始化 AI 引擎...</div>
      <div class="text-sm mb-6">若您是初次启动需要下载模型，请耐心等待。</div>
      <el-progress :percentage="100" :show-text="false" :indeterminate="true" class="mt-4" />
    </div>
  </div>
</template>
