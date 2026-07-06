# AIAADC 资源网站 / PWA

这是一个面向 AIAADC GitHub 组织的静态资源导航站。它保留 GitHub 作为资料维护源，同时给前台网站预留“高速下载 / GitHub 备用”双入口。

## 本地预览

```powershell
npm run serve
```

打开 `http://localhost:4173`。

## 更新资源清单

```powershell
npm run update:data
```

脚本会从 `https://github.com/AIAADC` 拉取公开仓库信息，更新 `data/resources.json`，并尽量保留你手动填写过的 `title`、`grade`、`type`、`tags`、`mirrorUrl`。

## 镜像下载

每个资源项都有两个下载字段：

- `mirrorUrl`：国内镜像或高速下载地址，优先展示为“高速下载”。
- `githubUrl`：GitHub 仓库备用入口。

现在 `mirrorUrl` 先留空；后续把 Gitee 镜像、EdgeOne Blob、学校服务器或其他公开下载地址填进去即可。

## EdgeOne Makers 部署

1. 把本目录推送到一个新的 GitHub 仓库。
2. 在 EdgeOne Pages / Makers 中导入该仓库。
3. 构建命令留空或填写 `npm run update:data`。
4. 输出目录选择项目根目录。
5. 使用平台提供的免费子域名，并生成二维码给同学访问。

如果后续绑定自有域名并选择中国大陆加速区域，需要按平台要求处理 ICP 备案。
