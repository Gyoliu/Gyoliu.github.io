---
title: webservice 的两种调用方式
categories:
  - Java
tags:
  - Java
date: 2021-05-26 11:04:29
updated: 2021-05-26 11:04:29
---
### CXF
```java
public class WebserviceConfiguration {
    private String targetEndpointAddress;
    private String targetNameSpace;
    private String operationName;
    private String soapActionURI;
    private String binding;
    private boolean useSOAPAction;
    private Integer timeout;
    private SOAPHeaderElement soapHeaderElement;
    private SOAPConstants soapConstants;
    private Object params;
    private boolean isObject;
    private boolean isArg0;

    public String getTargetEndpointAddress() {
        return targetEndpointAddress;
    }

    public void setTargetEndpointAddress(String targetEndpointAddress) {
        this.targetEndpointAddress = targetEndpointAddress;
    }

    public String getTargetNameSpace() {
        return targetNameSpace;
    }

    public void setTargetNameSpace(String targetNameSpace) {
        this.targetNameSpace = targetNameSpace;
    }

    public String getOperationName() {
        return operationName;
    }

    public void setOperationName(String operationName) {
        this.operationName = operationName;
    }

    public String getSoapActionURI() {
        return soapActionURI;
    }

    public void setSoapActionURI(String soapActionURI) {
        this.soapActionURI = soapActionURI;
    }

    public boolean getUseSOAPAction() {
        return useSOAPAction;
    }

    public void setUseSOAPAction(boolean useSOAPAction) {
        this.useSOAPAction = useSOAPAction;
    }

    public SOAPHeaderElement getSoapHeaderElement() {
        return soapHeaderElement;
    }

    public void setSoapHeaderElement(SOAPHeaderElement soapHeaderElement) {
        this.soapHeaderElement = soapHeaderElement;
    }

    public Object getParams() {
        return params;
    }

    public void setParams(Object params) {
        this.params = params;
    }

    public SOAPConstants getSoapConstants() {
        return soapConstants;
    }

    public void setSoapConstants(SOAPConstants soapConstants) {
        this.soapConstants = soapConstants;
    }

    public Integer getTimeout() {
        return timeout;
    }

    public void setTimeout(Integer timeout) {
        this.timeout = timeout;
    }

    public String getBinding() {
        return binding;
    }

    public void setBinding(String binding) {
        this.binding = binding;
    }

    public boolean isObject() {
        return isObject;
    }

    public void setObject(boolean object) {
        isObject = object;
    }

    public boolean isArg0() {
        return isArg0;
    }

    public void setArg0(boolean arg0) {
        isArg0 = arg0;
    }
}

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.serializer.JSONSerializer;
import com.alibaba.fastjson.serializer.SimplePropertyPreFilter;
import hk.com.cre.process.knowledge.thirdapi.vo.WebserviceResultVo;
import org.apache.cxf.endpoint.Client;
import org.apache.cxf.endpoint.ClientImpl;
import org.apache.cxf.endpoint.Endpoint;
import org.apache.cxf.jaxws.endpoint.dynamic.JaxWsDynamicClientFactory;
import org.apache.cxf.service.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.ObjectUtils;

import javax.activation.DataHandler;
import javax.xml.namespace.QName;
import java.beans.PropertyDescriptor;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

public class CxfWebserviceUtils {

    private static final Logger log = LoggerFactory.getLogger(CxfWebserviceUtils.class);

    private static final SimplePropertyPreFilter PROPERTY_PRE_FILTER = new SimplePropertyPreFilter(DataHandler.class){
        @Override
        public boolean apply(JSONSerializer serializer, Object source, String name) {
            if(this.getClazz() != null && this.getClazz().isInstance(source)){
                return false;
            }
            return super.apply(serializer, source, name);
        }
    };

    public static WebserviceResultVo send(WebserviceConfiguration configuration){
        try {
            log.info("CxfWebserviceUtils parmas:{}", JSON.toJSONString(configuration,PROPERTY_PRE_FILTER));
            JaxWsDynamicClientFactory factory = JaxWsDynamicClientFactory.newInstance();
            Client client = factory.createClient(configuration.getTargetEndpointAddress());
            QName method = new QName(configuration.getTargetNameSpace(), configuration.getOperationName());
            Object returnData = null;
            if(configuration.isObject()){
                ClientImpl client1 = (ClientImpl) client;
                Endpoint endpoint = client1.getEndpoint();
                ServiceInfo serviceInfo = endpoint.getService().getServiceInfos().get(0);
                QName service = new QName(configuration.getTargetNameSpace(), configuration.getBinding());
                BindingInfo binding = serviceInfo.getBinding(service);
                BindingOperationInfo bindingOperation = binding.getOperation(method);
                BindingMessageInfo input = bindingOperation.getInput();
                MessagePartInfo messagePartInfo = input.getMessageParts().get(0);
                Class<?> typeClass = messagePartInfo.getTypeClass();
                if(configuration.isArg0()){
                    typeClass = new PropertyDescriptor("arg0", typeClass).getPropertyType();
                }
                Object o = typeClass.newInstance();
                if(configuration.getParams() instanceof Map){
                    Map params = (Map) configuration.getParams();
                    for (Object o1 : params.keySet()) {
                        PropertyDescriptor descriptor = new PropertyDescriptor(String.valueOf(o1), typeClass);
                        descriptor.getWriteMethod().invoke(o, params.get(o1));
                    }
                } else if(configuration.getParams() instanceof List) {
                    List params = (List) configuration.getParams();
                    Field[] declaredFields = typeClass.getDeclaredFields();
                    for (int i = 0; i < declaredFields.length; i++) {
                        PropertyDescriptor descriptor = new PropertyDescriptor(declaredFields[i].getName(), typeClass);
                        descriptor.getWriteMethod().invoke(o, params.get(i));
                    }
                }
                Object[] invoke = client.invoke(method, o);
                if(!ObjectUtils.isEmpty(invoke)){
                    returnData = invoke[0];
                }
            } else {
                Object[] o = null;
                if(configuration.getParams() instanceof Map){
                    Map params = (Map) configuration.getParams();
                    o = params.values().toArray();
                } else if(configuration.getParams() instanceof List) {
                    List params = (List) configuration.getParams();
                    o = params.toArray();
                }
                Object[] invoke = client.invoke(method, o);
                if(!ObjectUtils.isEmpty(invoke)){
                    returnData = invoke[0];
                }
            }
//            Object[] invoke = client.invoke(method, ((List)configuration.getParams()).toArray());
            if(returnData != null){
                log.info("CxfWebserviceUtils response:{}", JSON.toJSONString(returnData));
                return WebserviceResultVo.success(returnData);
            } else {
                log.error("CxfWebserviceUtils response is null");
                return WebserviceResultVo.fail("response is null");
            }
        } catch (Exception e){
            log.info("CxfWebserviceUtils error!", e);
            return WebserviceResultVo.fail(e.getMessage());
        }
    }

}
```

### Axis
```java

Call call = (Call) new org.apache.axis.client.Service().createCall();
//设置超时时间
//      call.setTimeout(new Integer(20000));
        //设置目标接口的地址
        call.setTargetEndpointAddress(new URL(endpoint));
// 
        call.setSOAPActionURI(soapActionURI);
//添加头部信息
        if (!ObjectUtils.isEmpty(authDto)) {
            SOAPHeaderElement soapHeaderElement = new SOAPHeaderElement(targetNameSpace, "AuthenticationInfo");
            //设置参数名称和值
            soapHeaderElement.addChildElement("userName").addTextNode(authDto.getUsername());
            soapHeaderElement.addChildElement("password").addTextNode(authDto.getPassword());
            soapHeaderElement.addChildElement("authentication").addTextNode(authDto.getAuthentication());
            soapHeaderElement.addChildElement("locale").addTextNode(authDto.getLocale());
            soapHeaderElement.addChildElement("timeZone").addTextNode(authDto.getTimezone());
            call.addHeader(soapHeaderElement);
        }
        //设置字符编码
        call.setEncodingStyle(CharEncoding.UTF_8);
        //设置返回值类型
        call.setReturnClass(String[].class);
        call.setReturnType(XMLType.XSD_STRING);
//        call.setReturnType(XMLType.SOAP_ARRAY);
        // 设置具体调用的方法名 // WSDL里面描述的接口名称
        call.setOperationName(new QName(targetNameSpace, methodName));
        call.setUseSOAPAction(true);
// 文件流
call.addParameter(new QName(targetNameSpace, name), XMLType.SOAP_BASE64BINARY, ParameterMode.IN);
call.addParameter(new QName(targetNameSpace, name), XMLType.XSD_STRING, ParameterMode.IN);
 Object returnData = call.invoke(paramValues.toArray());
```
