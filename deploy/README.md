# Oracle Cloud 部署

Java API 部署在 `217.142.229.2`（Ubuntu 24.04，x86_64），API 域名为 `wannianli.mnnu.eu.org`。本文说明Java部署；`wannianli-worker.mnnu.eu.org` 由Cloudflare Worker独立运行，通过Wrangler单独发布。

## 架构

- 运行时：`eclipse-temurin:25.0.1_8-jre-ubi10-minimal`
- 应用包：Gradle `bootJar`，只读挂载到容器 `/app/app.jar`
- 容器内存上限：384 MiB；本机只发布到 `127.0.0.1:18080`
- 公网 HTTPS：主机现有 Traefik，经 Docker 网络 `hysteria2-simple-container_default` 转发
- `/` 由 Traefik 转发到 `/api/v1/almanac/current`；`/api/v1/almanac`、`/api/v2/almanac`路径前缀和精确`/mcp`路径原样转发
- `wannianli.mnnu.eu.org` 使用 DNS-only 的 A 记录指向 `217.142.229.2`，以便 Traefik 的 Let's Encrypt TLS-ALPN-01 证书签发和自动续期；不要给此记录开启 Cloudflare 代理

该服务器为 x86_64；仓库 GitHub Actions 发布的原生镜像仅面向 ARM64，所以这里使用 Java 25 JAR 运行时。

## 发布

在项目根目录先测试，再构建JAR：

```powershell
.\gradlew.bat test bootJar --no-daemon
```

把以下文件复制到服务器 `/opt/wannianli-api/`：

- `build/libs/wannianli-api-1.0.0.jar`，在服务器命名为 `wannianli-api.jar`
- `deploy/compose.yaml`

然后在服务器执行：

```bash
cd /opt/wannianli-api
docker compose config --quiet
docker compose up -d --no-deps --force-recreate --pull never wannianli-api
docker compose ps
curl -fsS http://127.0.0.1:18080/api/v1/almanac/current
```

公网验证：

```bash
curl -fsS https://wannianli.mnnu.eu.org/
curl -fsS https://wannianli.mnnu.eu.org/api/v1/almanac/current
```

同名JAR内容变化不会自动触发Compose重建，因此发布必须显式使用 `--force-recreate`。先将新JAR上传到独立发布目录、核对SHA-256并备份旧包，再原子替换。必须等待应用启动并实际调用计算接口，不能仅以容器为Up判断完成。此主机本次进程到应用启动约138秒，发布后还须等待实际计算就绪。

当前API/MCP 2.2.1、区间及太阳模型修正的版本、备份和验收见[发布记录](../docs/DEPLOYMENT_2026-10-23_V221.md)。前版见[2026-10-22 v2记录](../docs/DEPLOYMENT_2026-10-22_V2.md)，较早v1见[历史记录](../docs/DEPLOYMENT_2026-10-22.md)。发布清单位于`deploy/releases/`，先核对目标版本再操作回滚。

## 本轮JAR回滚

发布`20261023T021538Z`的旧包保存在 `/opt/wannianli-api/releases/20261023T021538Z/previous.jar`，旧Compose配置保存为同目录的 `compose.previous.yaml`。回滚时恢复这两个文件，先核对旧包哈希：

```bash
cd /opt/wannianli-api
printf '%s  %s\n' 92c6b8a9f40212cea3497dbaa596e89e593177172199a1828f52b18de2692f19 releases/20261023T021538Z/previous.jar | sha256sum -c -
install -m 0444 releases/20261023T021538Z/previous.jar wannianli-api.jar.rollback
install -m 0644 releases/20261023T021538Z/compose.previous.yaml compose.yaml.rollback
mv -f wannianli-api.jar.rollback wannianli-api.jar
mv -f compose.yaml.rollback compose.yaml
docker compose up -d --no-deps --force-recreate --pull never wannianli-api
```

之后验证当前与指定日期计算、v2和MCP。该旧包为2.2.0，支持区间、第二批规则和太阳修正，但覆盖说明尚未包含本次原表核验；回滚会恢复这部分旧说明。旧版Worker可在原账户内用`wrangler versions deploy 2dad3c1a-8342-4b04-9ec8-dc5894035aa3@100 --yes`恢复，随后独立执行同样的公网验收；Java回滚不会自动回滚Worker。

## 原迁移方案的DNS回退

旧 API 入口曾指向 Kubernetes 负载均衡。回滚时将 Cloudflare DNS 记录恢复为原地址并开启代理：

- A：`161.33.9.51`、`140.245.119.82`
- AAAA：`2603:c023:15:f400:0:a448:509a:e359`、`2603:c024:4518:57e:0:f2c3:2afa:bb13`

然后可停止新主机上的服务：

```bash
cd /opt/wannianli-api
docker compose down
```

`wannianli-worker.mnnu.eu.org` 始终由 Cloudflare Worker `wannianli-worker` 提供，与 Java API 的 DNS 回滚无关。
