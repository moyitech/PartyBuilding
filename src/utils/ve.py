import volcenginesdkcore,volcenginesdkecs
from volcenginesdkcore.rest import ApiException
from volcenginesdkcore.interceptor import RuntimeOption
from src.conf.env import settings

# 全局设置
configuration = volcenginesdkcore.Configuration()
configuration.ak = settings.VE_AK
configuration.sk = settings.VE_SK
configuration.debug = True
volcenginesdkcore.Configuration.set_default(configuration)

# 接口级别运行时参数设置,会覆盖全局配置
runtime_options = RuntimeOption(
  ak =  settings.VE_AK, 
  sk = settings.VE_SK, 
  client_side_validation = True, # 开启客户端校验,默认开启
)
# api_instance = volcenginesdkecs.ECSApi()
# create_command_request = volcenginesdkecs.CreateCommandRequest(
#     command_content="ls -l",
#     description="Your command description",
#     name="Your command name",
#     type="command",
#     _configuration=runtime_options,  # 配置运行时参数
# )
# try:
#     api_instance.create_command(create_command_request)
# except ApiException as e:
#     pass