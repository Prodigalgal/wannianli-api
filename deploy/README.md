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

当前发布优先采用同提交成功CI上传的JVM制品，记录其SHA-256并核对服务器实际挂载字节。本地构建可用于测试；跨系统生成的JAR摘要可能不同，不能据文件名替代发布清单中的制品身份。

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

同名JAR内容变化不会自动触发Compose重建，因此发布必须显式使用 `--force-recreate`。先将新JAR上传到独立发布目录、核对SHA-256并备份旧包，再原子替换。必须等待实际计算就绪并核对挂载包；既往该主机启动约138秒，不能以容器Up代替接口验收。

当前API/MCP 2.5.0，版本、CI制品、运行身份及每端60项公网验收见[发布记录](../docs/DEPLOYMENT_2026-10-23_V250.md)。本次经生产机既有Agent命令通道发布，没有变更SSH授权或路由。旧版2.3.0见[历史记录](../docs/DEPLOYMENT_2026-10-23_V230.md)。发布清单位于`deploy/releases/`，先核对目标版本再操作回滚。Worker默认Python urllib仍有Cloudflare1010限制，局部配置权限待补，见[边界](../docs/CLOUDFLARE_API_COMPATIBILITY.md)。

## 本轮JAR回滚

发布`20261023T132116Z`的旧包保存在 `/opt/wannianli-api/releases/20261023T132116Z/previous.jar`，Compose备份为同目录的 `compose.previous.yaml`。以下将2.5.0恢复为2.3.0；先核对当前包、旧包和备份配置哈希，任一不符就停止：

```bash
set -euo pipefail
cd /opt/wannianli-api
printf '%s  %s\n' cd3a1c640407a4f46ea7ae13b61aa297b697ff0c512e02e1a1ca5454c8c7a869 wannianli-api.jar | sha256sum -c -
printf '%s  %s\n' 42f1b0811894edf14d0b25a7b3721a43903f9990a5a3265aec85cf65f0fe0fd5 compose.yaml | sha256sum -c -
printf '%s  %s\n' 495a990b2b4e656190f589430ff6758dc4e464b838989a434516989db3a9a417 releases/20261023T132116Z/previous.jar | sha256sum -c -
printf '%s  %s\n' 42f1b0811894edf14d0b25a7b3721a43903f9990a5a3265aec85cf65f0fe0fd5 releases/20261023T132116Z/compose.previous.yaml | sha256sum -c -
install -m 0444 releases/20261023T132116Z/previous.jar wannianli-api.jar.rollback
install -m 0644 releases/20261023T132116Z/compose.previous.yaml compose.yaml.rollback
mv -f wannianli-api.jar.rollback wannianli-api.jar
mv -f compose.yaml.rollback compose.yaml
docker compose up -d --no-deps --force-recreate --pull never wannianli-api
```

之后验证当前与指定日期计算、v2和MCP。旧包为2.3.0，保留首批16项卷六月神；回滚会撤销后补十项月神和本批历日规则。Worker可在原账户内用`wrangler versions deploy 8892ad30-c4fa-4db4-af33-8541b232e426@100 --yes`恢复，随后独立执行公网验收；Java回滚不会自动回滚Worker。

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
