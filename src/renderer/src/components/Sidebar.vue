<template>
  <div class="h-full flex flex-col">
    <el-menu class="h-full flex-1 overflow-hidden border-r-0" :default-active="$route.path">
      <el-menu-item index="/" @click="() => $router.push('/')">
        <div class="flex items-center">
          <el-icon class="mr-2"><House /></el-icon>
          <span>首页</span>
        </div>
      </el-menu-item>
      <el-menu-item index="/search" @click="() => $router.push('/search')">
        <div class="flex items-center">
          <el-icon class="mr-2"><Search /></el-icon>
          <span>搜索</span>
        </div>
      </el-menu-item>
      <el-menu-item index="/settings" @click="() => $router.push('/settings')">
        <div class="flex items-center">
          <el-icon class="mr-2"><Setting /></el-icon>
          <span>设置</span>
        </div>
      </el-menu-item>
      <el-menu-item index="/about" @click="() => $router.push('/about')">
        <div class="flex items-center">
          <el-icon class="mr-2"><InfoFilled /></el-icon>
          <span>关于</span>
        </div>
      </el-menu-item>
    </el-menu>
    <el-button
      class="mt-auto"
      @click="
        () => {
          toggleDark()
        }
      "
    >
      <el-icon>
        <Moon v-if="isDark" />
        <Sunny v-else />
      </el-icon>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { House, Setting, InfoFilled, Moon, Sunny, Search } from '@element-plus/icons-vue'
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>
