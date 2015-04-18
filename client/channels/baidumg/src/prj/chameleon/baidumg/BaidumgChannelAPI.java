package prj.chameleon.baidumg;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.baidu.gamesdk.BDGameSDK;
import com.baidu.gamesdk.BDGameSDKSetting;
import com.baidu.platformsdk.PayOrderInfo;
import com.baidu.gamesdk.IResponse;
import com.baidu.gamesdk.ResultCode;

import org.json.JSONException;
import org.json.JSONObject;

import prj.chameleon.channelapi.Constants;
import prj.chameleon.channelapi.IAccountActionListener;
import prj.chameleon.channelapi.IDispatcherCb;
import prj.chameleon.channelapi.JsonMaker;
import prj.chameleon.channelapi.SingleSDKChannelAPI;

import java.lang.Override;
import java.lang.String;
import java.lang.Void;

/**
 * Created by wushauk on 8/11/14.
 */
public class BaidumgChannelAPI extends SingleSDKChannelAPI.SingleSDK {
    private IAccountActionListener mAccountListener;
    private static class UserInfo {
        public String mUserId;
        public String mUserSession;
    }
    private static class Cfg {
        public String mAppID;
        public String mAppKey;
        public BDGameSDKSetting.Orientation mScreenOrientation;
    }

    private UserInfo mUserInfo;
    private Cfg mCfg;
    @Override
    public void charge(Activity activity,
                       String orderId,
                       String uidInGame,
                       String userNameInGame,
                       String serverId,
                       String currencyName,
                       String payInfo,
                       int rate,
                       int realPayMoney,
                       boolean allowUserChange,
                       final IDispatcherCb cb) {
        PayOrderInfo payOrderInfo = new PayOrderInfo();
        payOrderInfo.setCooperatorOrderSerial(orderId);
        payOrderInfo.setProductName(currencyName);
        if (allowUserChange) {
            payOrderInfo.setTotalPriceCent((long)realPayMoney);//以分为单位
        } else {
            payOrderInfo.setTotalPriceCent(0);//以分为单位
        }
        payOrderInfo.setRatio(rate);
        payOrderInfo.setExtInfo(payInfo);//该字段将会在支付成功后原样返回给CP(不超过500个字符)

        BDGameSDK.pay(payOrderInfo, null, new IResponse<PayOrderInfo>(){
            @Override
            public void onResponse(int resultCode, String resultDesc,PayOrderInfo extraData) {
                switch(resultCode){
                    case ResultCode.PAY_SUCCESS://支付成功
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    case ResultCode.PAY_CANCEL://订单支付取消
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        break;
                    case ResultCode.PAY_FAIL://订单支付失败
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                        break;
                    case ResultCode.PAY_SUBMIT_ORDER://订单已经提交，支付结果未知（比如：已经请求了，但是查询超时）
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
                        break;
                }
            }
        });
    }

    @Override
    public void buy(Activity activity,
                    String orderId,
                    String uidInGame,
                    String userNameInGame,
                    String serverId,
                    String productName,
                    String productID,
                    String payInfo,
                    int productCount,
                    int realPayMoney,
                    final IDispatcherCb cb) {
        PayOrderInfo payOrderInfo = new PayOrderInfo();
        payOrderInfo.setCooperatorOrderSerial(orderId);
        payOrderInfo.setProductName(productName);
        payOrderInfo.setTotalPriceCent(0);
        payOrderInfo.setRatio(realPayMoney * productCount);
        payOrderInfo.setExtInfo(payInfo);//该字段将会在支付成功后原样返回给CP(不超过500个字符)

        BDGameSDK.pay(payOrderInfo, null, new IResponse<PayOrderInfo>(){
            @Override
            public void onResponse(int resultCode, String resultDesc, PayOrderInfo extraData) {
                switch(resultCode){
                    case ResultCode.PAY_SUCCESS://支付成功
                        cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                        break;
                    case ResultCode.PAY_CANCEL://订单支付取消
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_CANCEL, null);
                        break;
                    case ResultCode.PAY_FAIL://订单支付失败
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_FAIL, null);
                        break;
                    case ResultCode.PAY_SUBMIT_ORDER://订单已经提交，支付结果未知（比如：已经请求了，但是查询超时）
                        cb.onFinished(Constants.ErrorCode.ERR_PAY_IN_PROGRESS, null);
                        break;
                }

            }
        });
    }

    @Override
    public void initCfg(Bundle cfg) {
        mCfg = new Cfg();
        mCfg.mAppID = cfg.getString("appId");
        mCfg.mAppKey = cfg.getString("appKey");
        mCfg.mScreenOrientation = cfg.getBoolean("landscape") ?  BDGameSDKSetting.Orientation.LANDSCAPE:
                BDGameSDKSetting.Orientation.PORTRAIT;
    }

    @Override
    public void init(Activity activity, boolean isDebug, final IDispatcherCb cb) {
        BDGameSDKSetting appInfo = new BDGameSDKSetting();
        appInfo.setAppID(Integer.parseInt(mCfg.mAppID));
        appInfo.setAppKey(mCfg.mAppKey);
        appInfo.setDomain(isDebug ? BDGameSDKSetting.Domain.DEBUG : BDGameSDKSetting.Domain.RELEASE);
        appInfo.setOrientation(mCfg.mScreenOrientation);
        BDGameSDK.init(activity, appInfo, new IResponse<Void>() {
            @Override
            public void onResponse(int resultCode, String resultDesc, Void extraData){
                  switch (resultCode){
                      case ResultCode.INIT_SUCCESS:
                          cb.onFinished(Constants.ErrorCode.ERR_OK, null);
                          break;
                      case ResultCode.INIT_FAIL:
                      default:
                          cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                  }
            }
        });
    }

    @Override
    public void login(Activity activity, final IDispatcherCb cb, IAccountActionListener accountActionListener) {
        mAccountListener = accountActionListener;
        BDGameSDK.login(new IResponse<Void>() {
            @Override
            public void onResponse(int resultCode, String resultDesc, Void extraData) {
                switch (resultCode){
                    case ResultCode.LOGIN_SUCCESS:
                        mUserInfo.mUserId = BDGameSDK.getLoginUid();
                        mUserInfo.mUserSession = BDGameSDK.getLoginAccessToken();
                        cb.onFinished(Constants.ErrorCode.ERR_OK,
                                JsonMaker.makeLoginResponse(mUserInfo.mUserSession, mUserInfo.mUserId,
                                        mChannel));

                        setSuspendWindowChangeAccountListener();
                        setSessionInvalidListener();
                        break;
                    case ResultCode.LOGIN_CANCEL:
                        cb.onFinished(Constants.ErrorCode.ERR_CANCEL, null);
                        break;
                    case ResultCode.LOGIN_FAIL:
                        Log.e(Constants.TAG, "unknown login rsp state from baidumg");
                        cb.onFinished(Constants.ErrorCode.ERR_FAIL, null);
                    default:

                }
            }
        });
    }

    @Override
    public void logout(Activity activity) {
        BDGameSDK.logout();
        mUserInfo = null;
    }


    @Override
    public void antiAddiction(Activity activity, final IDispatcherCb cb) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                JSONObject ret = new JSONObject();
                try {
                    ret.put("flag", Constants.ANTI_ADDICTION_ADULT);
                    cb.onFinished(Constants.ErrorCode.ERR_OK, ret);
                } catch (JSONException e) {
                    cb.onFinished(Constants.ErrorCode.ERR_INTERNAL, null);
                }

            }
        });
    }

    @Override
    public String getUid() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserId;
        }
    }

    @Override
    public String getToken() {
        if (mUserInfo == null) {
            return "";
        } else {
            return mUserInfo.mUserSession;
        }
    }

    @Override
    public boolean isLogined() {
        return mUserInfo == null;
    }

    @Override
    public void exit(Activity activity, final IDispatcherCb cb) {
        BDGameSDK.destroy();
//        DkPlatform.destroy(activity);
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                cb.onFinished(Constants.ErrorCode.ERR_OK, null);
            }
        });
    }

    private void setSuspendWindowChangeAccountListener(){//设置切换账号事件监听（个人中心界面切换账号）
        BDGameSDK.setSuspendWindowChangeAccountListener(new IResponse<Void>(){
            @Override
            public void onResponse(int resultCode, String resultDesc, Void extraData) {
                switch(resultCode){
                    case ResultCode.LOGIN_SUCCESS:
                        //TODO 登录成功，不管之前是什么登录状态，游戏内部都要切换成新的用户
                        break;
                    case ResultCode.LOGIN_FAIL:
                        //TODO 登录失败，游戏内部之前如果是已经登录的，要清楚自己记录的登录状态，设置成未登录。如果之前未登录，不用处理。
                        break;
                    case ResultCode.LOGIN_CANCEL:
                        //TODO 取消，操作前后的登录状态没变化
                        break;

                }
            }

        });
    }

    private void setSessionInvalidListener(){
        BDGameSDK.setSessionInvalidListener(new IResponse<Void>(){
            @Override
            public void onResponse(int resultCode, String resultDesc, Void extraData) {
                if(resultCode == ResultCode.SESSION_INVALID){
                    //会话失效，开发者需要重新登录或者重启游戏
                    mAccountListener.onAccountLogout();
                }
            }
        });
    }
}
