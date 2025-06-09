<template>
  <div class="h-full w-full overflow-hidden">
    <el-container class="h-full">
      <el-aside width="100px" class="overflow-hidden">
        <slot name="sidebar"></slot>
      </el-aside>
      <el-main class="p-0 m-0 overflow-hidden">
        <slot></slot>
      </el-main>
    </el-container>
  </div>
</template>
