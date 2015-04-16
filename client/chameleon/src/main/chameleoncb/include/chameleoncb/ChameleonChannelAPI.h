#ifndef __ChameleonChannelAPI_H_
#define __ChameleonChannelAPI_H_

#include <jni.h>
#include <string>
#include "ChannelAPICallback.h"

namespace Chameleon {
namespace ChameleonChannelAPI{
    /**
     * 设置java的虚拟机实例
     */
    void setJavaVM(JavaVM * vm);

    /**
     * 释放设置的java的虚拟机实例
     */
    void releaseJavaVM(JavaVM * vm);

    /**
     * 注册事件的回调实例
     */
    void registCallback(ChannelAPICallbackInf * callbackImp);

    /**
     * 发起游客登录，有些平台不支持游客登录或者平台一些登录策略，也有可能
     * 会发起正式的登录
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int loginGuest(int id);

    /**
     * 如果是游客登录, 那么通过这个函数可以发起正式注册的请求
     * @param {int} id, 标识该请求的id
     * @param {std::string} tips, 有些平台可以在注册页面显示一段提供的tips
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int registGuest(int id, const std::string & tips);

    /**
     * 发起平台登录请求
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int login(int id);

    /**
     * 如果游戏使用了二级货币，那么可以通过这个函数发起充值的请求
     * @param {int} id, 标识该请求的id
     * @param {std::string} orderId, 此次购买的ID
     * @param {std::string} uidInGame, 玩家在游戏中的id
     * @param {std::string} userNameInGame, 玩家在游戏中的名字
     * @param {std::string} serverId, 玩家所在server的ID
     * @param {std::string} currencyName, 二级货币的名称
     * @param {std::string} payInfo, 从chameleon server获得了额外支付信息
     * @param {int} rate, 二级货币的兑换比率，例如，如果1RMB可以兑换10二级货币，那么rate=10
     * @param {int} realPayMoney, 希望玩家支付的数量，如果允许玩家自己输入，那么这个param可能
     *                            会被忽略
     * @param {bool} allowUserChange, 是否允许玩家自己输入
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int charge(int id, 
               const std::string & orderId, 
               const std::string & uidInGame, 
               const std::string & userNameInGame, 
               const std::string & serverId, 
               const std::string & currencyName, 
               const std::string & payInfo, 
               int rate,
               int realPayMoney,
               bool allowUserChange);

    /**
     * 如果游戏使用了购买道具的功能，那么可以通过这个函数发起购买的请求
     * @param {int} id, 标识该请求的id
     * @param {std::string} orderId, 此次购买的ID
     * @param {std::string} uidInGame, 玩家在游戏中的id
     * @param {std::string} userNameInGame, 玩家在游戏中的名字
     * @param {std::string} serverId, 玩家所在server的ID
     * @param {std::string} productName, 道具的名称
     * @param {std::string} productId, 产品的ID
     * @param {std::string} payInfo, 从chameleon server获得了额外支付信息
     * @param {int} productCount, 购买的数量
     * @param {int} realPayMoney, 希望玩家支付的数量，如果允许玩家自己输入，那么这个param可能
     *                            会被忽略
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int buy(int id,
            const std::string & orderId, 
            const std::string & uidInGame, 
            const std::string & userNameInGame, 
            const std::string & serverId, 
            const std::string & productName, 
            const std::string & productId,
            const std::string & payInfo,
            int productCount,
            int realPayMoney);

    /**
     * 该平台是否支持账号切换
     * @return {bool}, 是否支持账号切换
     */
    bool isSupportSwtichAccount();

    /**
     * 发起切换账户的请求
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int switchAccount(int id);

    /**
     * 创建并且显示平台的工具条
     * @param {int} position, 位置参数
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int createAndShowToolbar(int position);

    /**
     * 显示或者隐藏工具条
     * @param {bool} isVisible, 显示或者隐藏
     */
    void showToolbar(bool isVisible);

    /**
     * 销毁工具条
     */
    void destroyToolbar();

    /**
     * 调用渠道的onPause事件
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int onPause(int id);

    /**
     * 查询防沉迷信息
     * @param {int} id, 标识该请求的id
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int antiAddiction(int id);

    /** 
     * 退出渠道SDK
     * @return {int}, 0表示异步请求成功，否则表示失败
     */
    int exit();

    /**
     * 获取渠道的名字
     * @return {string}
     */
    std::string getChannelName();

    /**
     * 获取玩家的id
     * @return {string}
     */
    std::string getUid();

    /**
     * 获取玩家的token
     * @return {string}
     */
    std::string getToken();

    /**
     * 获取玩家的pay token
     * @return {string}
     */
    std::string getPayToken();

    /**
     * 响应从Chamemleon SDK服务器回来的信息
     * @param {string} loginRsp SDK服务器的回包
     * @return {bool} 登陆是否验证登陆成功
     */
    bool onLoginRsp(const std::string & loginRsp);

    /**
     * 是否登录
     */
    bool isLogined();
}
}

#endif // __ChameleonChannelAPI_H_



