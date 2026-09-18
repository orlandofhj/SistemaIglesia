package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "historial_servicios")
public class HistorialServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String accion;
    
    @Column(name = "servicio_titulo")
    private String servicioTitulo;
    
    private String estado;
    private String visibilidad;
    
    @Column(name = "solicitante_nombre")
    private String solicitanteNombre;
    
    @Column(name = "solicitante_cedula")
    private String solicitanteCedula;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }

    public String getServicioTitulo() { return servicioTitulo; }
    public void setServicioTitulo(String servicioTitulo) { this.servicioTitulo = servicioTitulo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getVisibilidad() { return visibilidad; }
    public void setVisibilidad(String visibilidad) { this.visibilidad = visibilidad; }

    public String getSolicitanteNombre() { return solicitanteNombre; }
    public void setSolicitanteNombre(String solicitanteNombre) { this.solicitanteNombre = solicitanteNombre; }

    public String getSolicitanteCedula() { return solicitanteCedula; }
    public void setSolicitanteCedula(String solicitanteCedula) { this.solicitanteCedula = solicitanteCedula; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    @PrePersist
    protected void onCreate() {
        this.fechaHora = LocalDateTime.now(ZoneId.of("America/Caracas"));
    }
}